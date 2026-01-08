// server/src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { Application } from 'express';

const isProd = process.env.NODE_ENV === 'production';

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
    // 프로덕션에서만 100% 샘플링, 개발에서는 꺼둠 (불필요한 데이터 전송 방지)
    tracesSampleRate: isProd ? 1.0 : 0,
    // 성능 프로파일링 (Pro 플랜 이상 필요, 무료는 꺼둠)
    profilesSampleRate: 0,
  });

  // Express 통합 설정
  Sentry.setupExpressErrorHandler(app);

  console.log('[Sentry] Initialized successfully.');
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
