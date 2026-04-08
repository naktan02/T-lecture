import { NextFunction, Request, Response } from 'express';
import logger from '../../config/logger';
import { getRoutePattern } from '../utils/requestMeta';

const SLOW_REQUEST_THRESHOLD_MS = 1000;

function shouldSkip(req: Request): boolean {
  const url = req.originalUrl || req.url || '';

  if (req.method === 'OPTIONS') return true;
  if (url.startsWith('/health') || url.startsWith('/metrics')) return true;
  if (url === '/favicon.ico') return true;

  return false;
}

function shouldLogRequest(req: Request, statusCode: number, durationMs: number): boolean {
  const url = req.originalUrl || req.url || '';

  if (url.startsWith('/api/v1/auth/refresh')) {
    return statusCode >= 500 || durationMs >= SLOW_REQUEST_THRESHOLD_MS;
  }

  if (statusCode >= 400) return true;

  return durationMs >= SLOW_REQUEST_THRESHOLD_MS;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (shouldSkip(req)) return next();

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    if (statusCode === 304) {
      return;
    }

    const roundedDurationMs = Math.round(durationMs * 10) / 10;

    if (statusCode < 500 && !shouldLogRequest(req, statusCode, roundedDurationMs)) {
      return;
    }

    const payload = {
      requestId: req.requestId ?? null,
      method: req.method,
      url: req.originalUrl || req.url,
      route: getRoutePattern(req),
      statusCode,
      durationMs: roundedDurationMs,
      userId: req.user?.id ?? null,
      queryKeys: Object.keys(req.query || {}),
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
    };

    const message =
      `${req.method} ${req.originalUrl || req.url} - ${statusCode} (${roundedDurationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(message, payload);
      return;
    }

    if (statusCode >= 400 || roundedDurationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(message, payload);
      return;
    }

    logger.info(message, payload);
  });

  next();
};

export default requestLogger;
