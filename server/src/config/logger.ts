// server/src/config/logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import path from 'path';
import { inspect } from 'util';
import * as Sentry from '@sentry/node';
import { getRequestId } from '../common/middlewares/requestContext';
import { createGrafanaLokiTransportFromEnv, GrafanaLokiTransport } from './grafanaLoki.transport';

const logDir = 'logs';
const { combine, timestamp, printf, colorize, json } = winston.format;

// NODE_ENV 기반 로그 레벨 자동 설정
const isProd = process.env.NODE_ENV === 'production';
const loggerLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');
const debugToFile = process.env.DEBUG_TO_FILE === 'true';
const grafanaLokiTransport = createGrafanaLokiTransportFromEnv();

const injectRequestContext = winston.format((info) => {
  if (info.requestId === undefined) {
    const requestId = getRequestId();
    if (requestId) {
      info.requestId = requestId;
    }
  }

  info.service = info.service || 't-lecture-server';
  info.environment = info.environment || process.env.NODE_ENV || 'development';
  return info;
});

const normalizeError = winston.format((info) => {
  if (info.error instanceof Error) {
    Object.defineProperty(info, '__error', {
      value: info.error,
      enumerable: false,
      configurable: true,
    });
    info.errorName = info.error.name;
    info.errorMessage = info.error.message;
    info.errorStack = info.error.stack;
    delete info.error;
  }

  return info;
});

const logFormat = printf((info) => {
  const { level, message, timestamp, ...rest } = info;
  const meta = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
  const metaString =
    Object.keys(meta).length > 0
      ? ` ${inspect(meta, { depth: 5, breakLength: Infinity, colors: false })}`
      : '';

  return `${timestamp} [${level}]: ${message}${metaString}`;
});

/**
 * Sentry로 에러를 전송하는 커스텀 Winston Transport
 * logger.error() 호출 시 자동으로 Sentry에 에러가 기록됩니다.
 */
class SentryTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: { level: string; message: string; [key: string]: unknown }, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // error 레벨일 때만 Sentry에 전송
    if (info.level === 'error') {
      // 메시지가 Error 객체인 경우 그대로 전송, 아니면 문자열로 전송
      if (info.__error instanceof Error) {
        Sentry.captureException(info.__error, {
          extra: { ...info },
        });
      } else {
        Sentry.captureMessage(info.message, {
          level: 'error',
          extra: info,
        });
      }
    }

    callback();
  }
}

const transports: winston.transport[] = [];

// 파일 로그는 프로덕션이 아닐 때만 (Render는 ephemeral filesystem)
if (!isProd) {
  transports.push(
    // 에러 로그 파일
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'error'),
      filename: `%DATE%.error.log`,
      maxFiles: '30d',
      zippedArchive: true,
    }),
    // 일반 로그 파일 (info 이상)
    new winstonDaily({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      filename: `%DATE%.log`,
      maxFiles: '30d',
      zippedArchive: true,
    }),
  );

  // DEBUG_TO_FILE=true 일 때 debug 레벨 파일도 생성
  if (debugToFile) {
    transports.push(
      new winstonDaily({
        level: 'debug',
        datePattern: 'YYYY-MM-DD',
        dirname: path.join(logDir, 'debug'),
        filename: `%DATE%.debug.log`,
        maxFiles: '7d',
        zippedArchive: true,
      }),
    );
  }
}

// 콘솔 출력 (개발/프로덕션 모두 - Render 로그 확인용)
transports.push(
  new winston.transports.Console({
    level: loggerLevel,
    format: isProd
      ? combine(injectRequestContext(), normalizeError(), timestamp(), json())
      : combine(
          injectRequestContext(),
          normalizeError(),
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
  }),
);

// Sentry Transport 추가 (SENTRY_DSN이 설정되어 있을 때만)
if (process.env.SENTRY_DSN) {
  transports.push(new SentryTransport({ level: 'error' }));
}

if (grafanaLokiTransport) {
  transports.push(grafanaLokiTransport);
}

const logger = winston.createLogger({
  level: loggerLevel,
  format: isProd
    ? combine(injectRequestContext(), normalizeError(), timestamp(), json())
    : combine(
        injectRequestContext(),
        normalizeError(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
      ),
  transports,
});

export async function drainLogger(timeoutMs = 3000): Promise<void> {
  if (grafanaLokiTransport instanceof GrafanaLokiTransport) {
    await grafanaLokiTransport.drain(timeoutMs);
  }
}

export function closeLogger(): void {
  if (grafanaLokiTransport instanceof GrafanaLokiTransport) {
    grafanaLokiTransport.close();
  }
}

export default logger;
