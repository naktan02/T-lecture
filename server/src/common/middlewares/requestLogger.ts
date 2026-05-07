import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import logger from '../../config/logger';
import { getLoggableUrl, getRoutePattern } from '../utils/requestMeta';

const SLOW_REQUEST_THRESHOLD_MS = 1000;
const REQUEST_ID_HEADER = 'X-Request-Id';
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{6,80}$/;

function getIncomingRequestId(req: Request): string | null {
  const requestId = req.get(REQUEST_ID_HEADER)?.trim();
  if (!requestId || !REQUEST_ID_PATTERN.test(requestId)) return null;

  return requestId;
}

function ensureRequestId(req: Request, res: Response): void {
  const requestId = req.requestId || getIncomingRequestId(req) || `req_${randomUUID()}`;
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
}

function shouldSkip(req: Request): boolean {
  const url = getLoggableUrl(req);

  if (req.method === 'OPTIONS') return true;
  if (url.startsWith('/health') || url.startsWith('/metrics')) return true;
  if (url === '/favicon.ico') return true;

  return false;
}

function shouldLogRequest(req: Request, statusCode: number, durationMs: number): boolean {
  const url = getLoggableUrl(req);

  if (url.startsWith('/api/v1/auth/refresh')) {
    return statusCode >= 500 || durationMs >= SLOW_REQUEST_THRESHOLD_MS;
  }

  if (statusCode >= 400) return true;

  return durationMs >= SLOW_REQUEST_THRESHOLD_MS;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  ensureRequestId(req, res);

  if (shouldSkip(req)) return next();

  const start = Date.now();

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - start;

    if (statusCode >= 500 || statusCode === 304 || req.errorLogged) {
      return;
    }

    if (!shouldLogRequest(req, statusCode, durationMs)) {
      return;
    }

    const payload = {
      event: statusCode >= 400 ? 'api.request.failed' : 'api.request.slow',
      requestId: req.requestId,
      method: req.method,
      path: getLoggableUrl(req),
      route: getRoutePattern(req),
      statusCode,
      durationMs,
      userId: req.user?.id ?? null,
    };

    const message =
      statusCode >= 400
        ? '[api.request.failed]'
        : `[api.request.slow] ${durationMs}ms >= ${SLOW_REQUEST_THRESHOLD_MS}ms`;

    logger.warn(message, payload);
  });

  next();
};

export default requestLogger;
