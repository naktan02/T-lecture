// client/src/shared/utils/logger.ts

interface LoggerConfig {
  isDev: boolean;
  prefix: string;
}

const config: LoggerConfig = {
  isDev: import.meta.env.DEV,
  prefix: '[T-Lecture]',
};

/**
 * 클라이언트용 Logger
 * - 개발 환경: 모든 로그 출력
 * - 프로덕션: error만 출력 (또는 외부 서비스로 전송 가능)
 */
export const logger = {
  /**
   * 디버깅용 로그 (개발 환경에서만 출력)
   */
  debug: (...args: unknown[]): void => {
    if (config.isDev) {
      console.log(`${config.prefix} [DEBUG]`, ...args);
    }
  },

  /**
   * 일반 정보 로그 (개발 환경에서만 출력)
   */
  info: (...args: unknown[]): void => {
    if (config.isDev) {
      console.info(`${config.prefix} [INFO]`, ...args);
    }
  },

  /**
   * 경고 로그 (항상 출력)
   */
  warn: (...args: unknown[]): void => {
    console.warn(`${config.prefix} [WARN]`, ...args);
  },

  /**
   * 에러 로그 (항상 출력)
   * 프로덕션에서 Sentry 등 외부 서비스 연동 가능
   */
  error: (...args: unknown[]): void => {
    console.error(`${config.prefix} [ERROR]`, ...args);
    // TODO: 프로덕션에서 Sentry 등으로 전송
    // if (!config.isDev) {
    //     Sentry.captureException(args[0]);
    // }
  },
};

export default logger;
