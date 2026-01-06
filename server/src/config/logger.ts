// server/src/config/logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'logs';
const { combine, timestamp, printf, colorize } = winston.format;

// NODE_ENV 기반 로그 레벨 자동 설정
const isProd = process.env.NODE_ENV === 'production';
const consoleLogLevel = isProd ? 'warn' : 'info'; // 프로덕션: warn, 개발: info
const debugToFile = process.env.DEBUG_TO_FILE === 'true';

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

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

const logger = winston.createLogger({
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports,
});

export default logger;
