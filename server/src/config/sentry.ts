// server/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { Application } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// 일일 에러 전송 제한 (무료 티어: 월 5000개 ≈ 일 166개, 안전하게 100개로 제한)
const DAILY_ERROR_LIMIT = 100;
let dailyErrorCount = 0;
let lastResetDate = new Date().toDateString();

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
 * @param app Express 애플리케이션 인스턴스
 */
export function initSentry(app: Application): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN is not set. Sentry will not be initialized.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // 프로덕션에서만 100% 샘플링, 개발에서는 50% (테스트용)
    tracesSampleRate: isProd ? 1.0 : 0.5,
    // 성능 프로파일링 (Pro 플랜 이상 필요, 무료는 꺼둠)
    profilesSampleRate: 0,
    // 에러 샘플링 (50%만 전송하여 한도 절약)
    sampleRate: isProd ? 0.5 : 1.0,
    // 일일 한도 체크
    beforeSend(event) {
      if (!canSendError()) {
        console.warn('[Sentry] Daily error limit reached. Event dropped.');
        return null; // 이벤트 전송 안 함
      }
      return event;
    },
  });

  // Express 통합 설정
  Sentry.setupExpressErrorHandler(app);

  console.log('[Sentry] Initialized successfully with rate limiting.');
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
