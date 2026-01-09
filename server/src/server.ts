// src/server.ts
// dotenv must be loaded first to read environment variables
import 'dotenv/config';

// New Relic: only load if license key is configured (prevents errors in local dev)
if (process.env.NEW_RELIC_LICENSE_KEY) {
  console.log('[New Relic] Loading agent...');
  require('newrelic');
  console.log('[New Relic] Agent loaded successfully.');
} else {
  console.log('[New Relic] NEW_RELIC_LICENSE_KEY not set. Skipping.');
}
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config';
import { requestLogger, rateLimiter } from './common/middlewares';
import v1Router from './api/v1';
import errorHandler from './common/middlewares/errorHandler';
import logger from './config/logger';
import prisma from './libs/prisma';
import { initSentry } from './config/sentry';

const app = express();

// Sentry 초기화 (에러 핸들러보다 먼저 설정해야 함)
initSentry(app);

const isProd = process.env.NODE_ENV === 'production';

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
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// 전역 Rate Limit 적용 (15분당 IP당 100회)
app.use('/api', rateLimiter.apiLimiter);

// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1Router);

// 기본 라우트
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello T-LECTURE!');
});
app.use(errorHandler);

// 서버 시작
const server = app.listen(config.port, () => {
  logger.info(`Server listening at http://localhost:${config.port}`);
});

// DB 연결 미리 생성 (첫 요청 지연 방지)
server.on('listening', async () => {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
  }
});

module.exports = { app, server };
