import * as Sentry from '@sentry/node';

const isProd = process.env.NODE_ENV === 'production';

const DEFAULT_PROD_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_DEV_TRACES_SAMPLE_RATE = 1.0;
const DEFAULT_PROFILES_SAMPLE_RATE = 0;

function parseSampleRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 1) return fallback;

  return parsed;
}

export function getSentryTracesSampleRate(): number {
  return parseSampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
    isProd ? DEFAULT_PROD_TRACES_SAMPLE_RATE : DEFAULT_DEV_TRACES_SAMPLE_RATE,
  );
}

export function getSentryProfilesSampleRate(): number {
  return parseSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, DEFAULT_PROFILES_SAMPLE_RATE);
}

export function buildSentryInitOptions(dsn: string): Sentry.NodeOptions {
  return {
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: getSentryTracesSampleRate(),
    profilesSampleRate: getSentryProfilesSampleRate(),
    sampleRate: 1.0,
    integrations: [Sentry.prismaIntegration()],
  };
}
