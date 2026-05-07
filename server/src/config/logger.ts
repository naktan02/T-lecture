// server/src/config/logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import path from 'path';
import { inspect } from 'util';
import * as Sentry from '@sentry/node';

const logDir = 'logs';
const { combine, timestamp, printf, colorize } = winston.format;

const allowedLogLevels = new Set(['error', 'warn', 'info', 'debug']);

function normalizeLogLevel(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().toLowerCase();
  return normalized && allowedLogLevels.has(normalized) ? normalized : fallback;
}

// 운영 로그가 불필요하게 커지지 않도록 기본 콘솔/파일 로그는 warn 이상만 출력한다.
// 상세 로그가 필요할 때만 LOG_LEVEL=info 또는 LOG_LEVEL=debug로 명시적으로 올린다.
const isProd = process.env.NODE_ENV === 'production';
const consoleLogLevel = normalizeLogLevel(
  process.env.LOG_LEVEL || process.env.SERVER_LOG_LEVEL,
  'warn',
);
const fileLogLevel = normalizeLogLevel(process.env.FILE_LOG_LEVEL, 'warn');
const debugToFile = process.env.DEBUG_TO_FILE === 'true';

const logFormat = printf((info) => {
  const { level, message, timestamp, ...rest } = info;
  const meta = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined));
  const metaString =
    Object.keys(meta).length > 0
      ? ` ${inspect(meta, {
          depth: 3,
          breakLength: Infinity,
          colors: false,
          maxArrayLength: 20,
          maxStringLength: 1000,
        })}`
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
      if (info.error instanceof Error) {
        Sentry.captureException(info.error, {
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
      level: fileLogLevel,
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
    level: consoleLogLevel,
    format: isProd
      ? combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
      : combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  }),
);

// Sentry Transport 추가 (SENTRY_DSN이 설정되어 있을 때만)
if (process.env.SENTRY_DSN) {
  transports.push(new SentryTransport({ level: 'error' }));
}

const logger = winston.createLogger({
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports,
});

export default logger;
