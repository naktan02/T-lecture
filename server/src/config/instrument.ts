// server/src/instrument.ts
// Sentry instrumentation file - loaded first via --import flag
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { buildSentryInitOptions, getSentryTracesSampleRate } from './sentryOptions';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init(buildSentryInitOptions(dsn));
  console.log(`[Sentry] Instrumented before any imports (traces=${getSentryTracesSampleRate()})`);
}
