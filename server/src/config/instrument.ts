// server/src/instrument.ts
// Sentry instrumentation file - loaded first via --import flag
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const isProd = process.env.NODE_ENV === 'production';
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: isProd ? 0 : 0.5,
    profilesSampleRate: 0,
    sampleRate: 1.0, // 에러는 항상 100% 수집
    integrations: isProd ? [] : [Sentry.prismaIntegration()],
  });
  console.log('[Sentry] Instrumented before any imports');
}
