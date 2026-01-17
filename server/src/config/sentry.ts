// server/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import type { Application } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// 일일 에러 전송 제한 (무료 티어: 월 5000개 ≈ 일 166개, 안전하게 100개로 제한)
const DAILY_ERROR_LIMIT = 100;
let dailyErrorCount = 0;
let lastResetDate = new Date().toDateString();

// logger는 sentry 초기화 후에 import 가능 (순환 참조 방지)
let logger: typeof import('./logger').default | null = null;

/**
 * logger를 지연 로드하는 헬퍼
 * Sentry 초기화 시점에는 logger가 준비되지 않았을 수 있음
 */
function getLogger() {
  if (!logger) {
    try {
      // dynamic import 대신 require 사용 (동기적)

      logger = require('./logger').default;
    } catch {
      // logger를 아직 사용할 수 없는 경우 무시
    }
  }
  return logger;
}

/**
 * 로깅 헬퍼 - logger 사용 가능하면 logger, 아니면 console 사용
 */
function log(level: 'info' | 'warn' | 'error', message: string): void {
  const l = getLogger();
  if (l) {
    l[level](message);
  } else {
    // eslint-disable-next-line no-console
    console[level](message);
  }
}

/**
 * 일일 에러 카운트 리셋 체크
 */
function checkAndResetDailyCount(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyErrorCount = 0;
    lastResetDate = today;
  }
}

/**
 * 일일 한도 내에서만 에러 전송 허용
 */
function canSendError(): boolean {
  checkAndResetDailyCount();
  if (dailyErrorCount >= DAILY_ERROR_LIMIT) {
    return false;
  }
  dailyErrorCount++;
  return true;
}

/**
 * Sentry 초기화 함수
 * 이 함수는 모든 import 전에 server.ts에서 호출되어야 합니다.
 * @returns 초기화 성공 여부
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    log('warn', '[Sentry] SENTRY_DSN is not set. Sentry will not be initialized.');
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // 개발에서만 성능 추적 (프로덕션에서는 불필요)
    tracesSampleRate: isProd ? 0 : 0.5,
    // 성능 프로파일링 (Pro 플랜 이상 필요, 무료는 꺼둠)
    profilesSampleRate: 0,
    // 에러 샘플링 (50%만 전송하여 한도 절약)
    sampleRate: isProd ? 0.5 : 1.0,
    // Prisma 쿼리 성능 추적 (개발 환경에서만 유용)
    integrations: isProd ? [] : [Sentry.prismaIntegration()],
    // 일일 한도 체크
    beforeSend(event) {
      if (!canSendError()) {
        log('warn', '[Sentry] Daily error limit reached. Event dropped.');
        return null; // 이벤트 전송 안 함
      }
      return event;
    },
  });

  log('info', '[Sentry] Initialized successfully with Prisma integration.');
  return true;
}

/**
 * Express 에러 핸들러 설정
 * 반드시 라우터 뒤, 커스텀 에러 핸들러 전에 호출
 */
export function setupSentryErrorHandler(app: Application): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }
}

/**
 * 현재 일일 에러 전송 현황 조회
 */
export function getSentryUsage(): { count: number; limit: number; remaining: number } {
  checkAndResetDailyCount();
  return {
    count: dailyErrorCount,
    limit: DAILY_ERROR_LIMIT,
    remaining: DAILY_ERROR_LIMIT - dailyErrorCount,
  };
}

/**
 * Sentry에 에러를 수동으로 캡처하는 헬퍼 함수
 * @param error 캡처할 에러
 * @param context 추가 컨텍스트 정보
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

export { Sentry };
