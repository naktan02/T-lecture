// server/src/config/logger.ts
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'logs';
const { combine, timestamp, printf, colorize } = winston.format;

// 환경 변수에서 로그 레벨 읽기
const consoleLogLevel = process.env.LOG_LEVEL || 'info';
const debugToFile = process.env.DEBUG_TO_FILE === 'true';

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const transports: winston.transport[] = [
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
];

// DEBUG_TO_FILE=true 일 때 debug 레벨 파일도 생성
if (debugToFile) {
  transports.push(
    new winstonDaily({
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(logDir, 'debug'),
      filename: `%DATE%.debug.log`,
      maxFiles: '7d', // 디버그는 7일만 보관
      zippedArchive: true,
    }),
  );
}

const logger = winston.createLogger({
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports,
});

// 개발 환경에서 콘솔 출력 추가
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: consoleLogLevel, // 환경 변수로 제어
      format: combine(colorize(), logFormat),
    }),
  );
}

export default logger;
