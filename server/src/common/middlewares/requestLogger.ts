// server/src/common/middlewares/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';

const SLOW_GET_THRESHOLD_MS = 500;

/**
 * 로그 기록에서 제외할 요청인지 확인합니다.
 */
function shouldSkip(req: Request): boolean {
  const url = req.originalUrl || req.url || '';
  if (req.method === 'OPTIONS') return true;
  if (url.startsWith('/health') || url.startsWith('/metrics')) return true;
  if (url === '/favicon.ico') return true;
  return false;
}

function shouldLogSuccessRequest(req: Request, statusCode: number, durationMs: number): boolean {
  if (statusCode >= 400) return true;

  const url = req.originalUrl || req.url || '';

  if (url.startsWith('/api/v1/auth/refresh')) return false;
  if (req.method === 'GET' || req.method === 'HEAD') return durationMs >= SLOW_GET_THRESHOLD_MS;

  return true;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (shouldSkip(req)) return next();

  const start = Date.now();

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - start;

    // ✅ 5xx는 errorHandler 로깅에 맡김 (기존 로직 유지)
    if (statusCode >= 500) return;
    if (statusCode === 304) return;

    const payload = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      userId: req.user?.id ?? null,
      queryKeys: Object.keys(req.query || {}),
    };

    if (!shouldLogSuccessRequest(req, statusCode, durationMs)) return;

    // 로그 메시지를 더 읽기 쉽게 개선
    const logMessage = `${req.method} ${req.originalUrl || req.url} - ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 400) {
      logger.warn(logMessage, payload);
    } else {
      logger.info(logMessage, payload);
    }
  });

  next();
};

export default requestLogger;
