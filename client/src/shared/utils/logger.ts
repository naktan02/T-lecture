// client/src/shared/utils/logger.ts

interface LoggerConfig {
  minLevel: LogLevel;
  prefix: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function readLogLevel(): LogLevel {
  const envLevel = String(import.meta.env.VITE_CLIENT_LOG_LEVEL || '').toLowerCase();
  if (envLevel in LOG_LEVEL_PRIORITY) return envLevel as LogLevel;

  return 'warn';
}

const config: LoggerConfig = {
  minLevel: readLogLevel(),
  prefix: '[T-Lecture]',
};

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.minLevel];
}

/**
 * 클라이언트용 Logger
 * - 기본값: warn/error만 출력
 * - VITE_CLIENT_LOG_LEVEL=info 또는 debug일 때만 상세 로그 출력
 */
export const logger = {
  /**
   * 디버깅용 로그 (개발 환경에서만 출력)
   */
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.debug(`${config.prefix} [DEBUG]`, ...args);
    }
  },

  /**
   * 일반 정보 로그 (명시적으로 활성화한 경우에만 출력)
   */
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info(`${config.prefix} [INFO]`, ...args);
    }
  },

  /**
   * 경고 로그 (항상 출력)
   */
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(`${config.prefix} [WARN]`, ...args);
    }
  },

  /**
   * 에러 로그 (항상 출력)
   * 프로덕션에서 Sentry 등 외부 서비스 연동 가능
   */
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error(`${config.prefix} [ERROR]`, ...args);
    }
    // TODO: 프로덕션에서 Sentry 등으로 전송
    // if (!config.isDev) {
    //     Sentry.captureException(args[0]);
    // }
  },
};

export default logger;
