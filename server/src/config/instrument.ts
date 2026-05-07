// server/src/instrument.ts
// Sentry instrumentation file - loaded first via --import flag
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { buildSentryInitOptions, getSentryTracesSampleRate } from './sentryOptions';

const dsn = process.env.SENTRY_DSN;
const logLevel = (process.env.LOG_LEVEL || process.env.SERVER_LOG_LEVEL || '').toLowerCase();
const shouldLogInfo = logLevel === 'info' || logLevel === 'debug';

if (dsn) {
  Sentry.init(buildSentryInitOptions(dsn));
  if (shouldLogInfo) {
    console.info(
      `[Sentry] Instrumented before any imports (traces=${getSentryTracesSampleRate()})`,
    );
  }
}
