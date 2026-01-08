// server/src/config/logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import Transport from 'winston-transport';
import path from 'path';
import * as Sentry from '@sentry/node';

const logDir = 'logs';
const { combine, timestamp, printf, colorize } = winston.format;

// NODE_ENV 기반 로그 레벨 자동 설정
const isProd = process.env.NODE_ENV === 'production';
const consoleLogLevel = isProd ? 'warn' : 'info'; // 프로덕션: warn, 개발: info
const debugToFile = process.env.DEBUG_TO_FILE === 'true';

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
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
