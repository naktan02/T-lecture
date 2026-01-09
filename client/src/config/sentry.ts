// client/src/config/sentry.ts
import * as Sentry from '@sentry/react';

// 일일 에러 전송 제한 (무료 티어 보호)
const DAILY_ERROR_LIMIT = 50;
let dailyErrorCount = 0;
let lastResetDate = new Date().toDateString();

function checkAndResetDailyCount(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyErrorCount = 0;
    lastResetDate = today;
  }
}

function canSendError(): boolean {
  checkAndResetDailyCount();
  if (dailyErrorCount >= DAILY_ERROR_LIMIT) {
    return false;
  }
  dailyErrorCount++;
  return true;
}

/**
 * Sentry 초기화 (클라이언트용)
 * main.tsx에서 앱 렌더링 전에 호출
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN is not set. Sentry will not be initialized.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // 프로덕션에서만 성능 추적
    tracesSampleRate: import.meta.env.PROD ? 0.5 : 0,
    // 에러 샘플링 (50%만 전송)
    sampleRate: import.meta.env.PROD ? 0.5 : 1.0,
    // 일일 한도 체크
    beforeSend(event) {
      if (!canSendError()) {
        console.warn('[Sentry] Daily error limit reached. Event dropped.');
        return null;
      }
      return event;
    },
    // React 통합
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // 세션 리플레이 (에러 발생 시만)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.5 : 0,
  });

  console.log('[Sentry] Client initialized successfully.');
}

/**
 * 에러 수동 캡처
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Sentry Error Boundary 컴포넌트
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

export { Sentry };
