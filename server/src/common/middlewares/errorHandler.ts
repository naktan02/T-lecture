// server/src/common/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import logger from '../../config/logger';
import { mapPrismaError } from '../errors/prismaErrorMapper';
import AppError from '../errors/AppError';

const defaultCodeByStatus = (statusCode: number): string => {
  const statusMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
  };
  return statusMap[statusCode] || 'INTERNAL_ERROR';
};

function normalizeError(err: unknown): {
  statusCode: number;
  code: string;
  message: string;
  stack?: string;
  meta?: Record<string, unknown> | null;
  isAppError: boolean;
} {
  if (err instanceof AppError) {
    const statusCode = Number(err.statusCode || 500);
    return {
      statusCode,
      code: err.code || defaultCodeByStatus(statusCode),
      message: err.message,
      stack: err.stack,
      meta: err.meta,
      isAppError: true,
    };
  }

  // Prisma 트랜잭션 타임아웃 에러 처리
  if (err instanceof Error) {
    // 트랜잭션 타임아웃
    if (err.message.includes('Transaction already closed') ||
      err.message.includes('Transaction is no longer valid') ||
      err.message.includes('Expired')) {
      return {
        statusCode: 408,
        code: 'TRANSACTION_TIMEOUT',
        message: '요청 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        stack: err.stack,
        isAppError: false,
      };
    }

    // 연결 획득 타임아웃
    if (err.message.includes('Timed out fetching a new connection')) {
      return {
        statusCode: 503,
        code: 'CONNECTION_TIMEOUT',
        message: '서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
        stack: err.stack,
        isAppError: false,
      };
    }
  }

  // 누군가 `throw "boom"` 같은 걸 해도 안전하게
  if (err instanceof Error) {
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal Server Error',
      stack: err.stack,
      isAppError: false,
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal Server Error',
    isAppError: false,
  };
}

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const mapped = mapPrismaError(err);
  const normalized = normalizeError(mapped ?? err);

  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage =
    isProd && !normalized.isAppError ? 'Internal Server Error' : normalized.message;

  const logPayload = {
    code: normalized.code,
    statusCode: normalized.statusCode,
    message: normalized.message,
    userId: req.user?.id ?? null,
    method: req.method,
    url: req.originalUrl || req.url,
    meta: normalized.meta ?? null,
    ...(normalized.statusCode >= 500 ? { stack: normalized.stack } : {}),
  };

  if (normalized.statusCode >= 500) {
    logger.error('[API ERROR]', logPayload);

    // Sentry에 500 에러 전송 (컨텍스트 포함)
    Sentry.withScope((scope) => {
      scope.setUser({ id: req.user?.id?.toString() });
      scope.setTag('statusCode', normalized.statusCode.toString());
      scope.setTag('errorCode', normalized.code);
      scope.setContext('request', {
        method: req.method,
        url: req.originalUrl || req.url,
        userId: req.user?.id ?? null,
      });
      scope.setContext('error', {
        code: normalized.code,
        message: normalized.message,
        meta: normalized.meta,
      });
      Sentry.captureException(err);
    });
  } else {
    logger.warn('[API ERROR]', logPayload);
  }

  res.status(normalized.statusCode).json({
    error: safeMessage,
    code: normalized.code,
    statusCode: normalized.statusCode,
  });
};

export default errorHandler;
