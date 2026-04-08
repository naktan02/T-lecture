import { NextFunction, Request, Response } from 'express';
import logger from '../../config/logger';

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

  const start = Date.now();

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - start;

    if (statusCode >= 500 || statusCode === 304) {
      return;
    }

    if (!shouldLogRequest(req, statusCode, durationMs)) {
      return;
    }

    const payload = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      userId: req.user?.id ?? null,
      queryKeys: Object.keys(req.query || {}),
    };

    const message = `${req.method} ${req.originalUrl || req.url} - ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 400) {
      logger.warn(message, payload);
      return;
    }

    logger.info(message, payload);
  });

  next();
};

export default requestLogger;
