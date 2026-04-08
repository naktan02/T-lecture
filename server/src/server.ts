// src/server.ts
// dotenv must be loaded first to read environment variables
import 'dotenv/config';

// Sentry: setupSentryErrorHandler is still needed for Express error handling
import { setupSentryErrorHandler, Sentry } from './config/sentry';

import express, { Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config';
import { requestContext, requestLogger, rateLimiter } from './common/middlewares';
import v1Router from './api/v1';
import errorHandler from './common/middlewares/errorHandler';
import logger, { closeLogger, drainLogger } from './config/logger';
import {
  startNoticeAttachmentCleanup,
  stopNoticeAttachmentCleanup,
} from './domains/notice/notice-attachment-cleanup.service';
import prisma, {
  getDatabaseHeartbeatStatus,
  recordDatabaseConnectivitySuccess,
  startDatabaseHeartbeat,
  stopDatabaseHeartbeat,
} from './libs/prisma';

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// ✅ gzip 압축 (가장 먼저 적용 - 모든 응답 압축)
app.use(compression());

// Render 같은 리버스 프록시 뒤에서 실행될 때 필요 (rate-limit이 IP를 올바르게 인식하도록)
if (isProd) {
  app.set('trust proxy', 1);
}

const parseOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// ✅ NODE_ENV에 따라 env 변수 하나만 선택
const allowedOrigins = isProd
  ? parseOrigins(process.env.CORS_ORIGINS_PROD)
  : parseOrigins(process.env.CORS_ORIGINS_DEV);

// ✅ 운영인데 PROD 오리진이 비어있으면 즉시 실패(안전)
if (isProd && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS_PROD must be set in production');
}

// ✅ 개발인데 DEV 오리진도 비어있으면 기본값 제공(선택)
if (!isProd && allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}

// 🛡️ 보안 헤더 설정 (Helmet) - API 서버용 간소화
// CSP는 HTML을 직접 제공하는 서버에만 필요하므로 비활성화
app.use(requestContext);
app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin(origin, callback) {
      // 서버-서버 요청(origin 없이 올 수 있음)은 허용
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // 허용되지 않은 origin
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Notice-Download-Token'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  }),
);

// preflight(OPTIONS) 허용
app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());

const roundMetric = (value: number): number => Math.round(value * 10) / 10;

function getMemorySnapshot(): Record<string, number> {
  const used = process.memoryUsage();

  return {
    rssMb: roundMetric(used.rss / 1024 / 1024),
    heapUsedMb: roundMetric(used.heapUsed / 1024 / 1024),
    heapTotalMb: roundMetric(used.heapTotal / 1024 / 1024),
    externalMb: roundMetric(used.external / 1024 / 1024),
  };
}

function getProcessDiagnostics(): Record<string, unknown> {
  return {
    pid: process.pid,
    uptimeSec: roundMetric(process.uptime()),
    memory: getMemorySnapshot(),
    dbHeartbeat: getDatabaseHeartbeatStatus(),
  };
}

// Render health check path는 /api 바깥으로 두어 rate limit과 분리한다.
app.get('/healthz', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...getProcessDiagnostics(),
  });
});

// 전역 Rate Limit 적용 (15분당 IP당 100회)
app.use('/api', rateLimiter.apiLimiter);

// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1Router);

// 기본 라우트
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello T-LECTURE!');
});

// ⭐️ Sentry 에러 핸들러: 라우터 뒤, 커스텀 에러 핸들러 전에 위치해야 함
setupSentryErrorHandler(app);

app.use(errorHandler);

// 서버 시작
const server = app.listen(config.port, () => {
  logger.info(`Server listening at http://localhost:${config.port}`);
});

// 메모리 사용량 로깅 헬퍼
function logMemoryUsage(label: string): void {
  const used = process.memoryUsage();
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + 'MB';
  logger.info(
    `[Memory ${label}] RSS: ${formatMB(used.rss)}, Heap: ${formatMB(used.heapUsed)}/${formatMB(used.heapTotal)}`,
  );
}

// DB 연결 미리 생성 (첫 요청 지연 방지)
server.on('listening', async () => {
  try {
    await prisma.$connect();
    recordDatabaseConnectivitySuccess();
    logger.info('Database connection established');

    // Supavisor 5분 유휴 타임아웃 방지를 위한 heartbeat 시작
    startDatabaseHeartbeat();
    startNoticeAttachmentCleanup();

    // 시작 시 메모리 로깅
    logMemoryUsage('startup');

    // 5분마다 메모리 사용량 체크 (무료 티어: 512MB 제한)
    setInterval(
      () => {
        const used = process.memoryUsage();
        const heapUsedMB = used.heapUsed / 1024 / 1024;
        if (heapUsedMB > 400) {
          logger.warn(
            `[Memory Warning] Heap usage high: ${heapUsedMB.toFixed(2)}MB (limit ~512MB)`,
          );
          Sentry.captureMessage(`High memory usage: ${heapUsedMB.toFixed(2)}MB`, 'warning');
        }
      },
      5 * 60 * 1000,
    ); // 5분
  } catch (error) {
    logger.error('Failed to connect to database:', error);
  }
});

// 처리되지 않은 Promise 에러 핸들링 (서버 크래시 방지)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });

  // Sentry에 전송
  Sentry.withScope((scope) => {
    scope.setTag('type', 'unhandledRejection');
    scope.setExtra('promise', String(promise));
    if (reason instanceof Error) {
      Sentry.captureException(reason);
    } else {
      Sentry.captureMessage(`Unhandled Rejection: ${String(reason)}`, 'error');
    }
  });
});

// 처리되지 않은 예외 핸들링
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);

  // Sentry에 전송 후 graceful shutdown
  Sentry.withScope((scope) => {
    scope.setTag('type', 'uncaughtException');
    scope.setLevel('fatal');
    Sentry.captureException(error);
  });

  // Sentry 전송 완료 대기 후 종료 (최대 2초)
  Promise.allSettled([drainLogger(1500), Sentry.close(2000)]).finally(() => {
    closeLogger();
    process.exit(1);
  });
});

// SIGTERM 핸들링 (Render가 종료 시그널 보낼 때)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Graceful shutdown...', getProcessDiagnostics());

  Sentry.captureMessage('Server received SIGTERM - shutting down', 'info');

  server.close(async () => {
    logger.info('HTTP server closed', getProcessDiagnostics());
    stopNoticeAttachmentCleanup();
    stopDatabaseHeartbeat();
    await prisma.$disconnect();
    logger.info('Database connection closed', getProcessDiagnostics());
    await drainLogger(2000);
    await Sentry.close(2000);
    closeLogger();
    process.exit(0);
  });

  // 10초 내 종료 안 되면 강제 종료
  setTimeout(() => {
    logger.error('Graceful shutdown timeout. Force exit.', getProcessDiagnostics());
    process.exit(1);
  }, 10000);
});

module.exports = { app, server };
