import * as Sentry from '@sentry/node';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import logger from '../../config/logger';
import AppError from '../errors/AppError';
import { mapPrismaError } from '../errors/prismaErrorMapper';

const defaultCodeByStatus = (statusCode: number): string => {
  const statusMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    410: 'GONE',
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

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_COUNT':
        return {
          statusCode: 400,
          code: 'FILE_COUNT_LIMIT_EXCEEDED',
          message: '첨부파일 수가 너무 많습니다. 파일 수를 줄여주세요.',
          isAppError: true,
        };
      case 'LIMIT_FILE_SIZE':
        return {
          statusCode: 400,
          code: 'FILE_SIZE_LIMIT_EXCEEDED',
          message: '첨부파일 용량은 5MB 이하만 가능합니다.',
          isAppError: true,
        };
      default:
        return {
          statusCode: 400,
          code: 'FILE_UPLOAD_ERROR',
          message: err.message,
          isAppError: true,
        };
    }
  }

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
  const requestUrl = req.originalUrl || req.url || '';
  const isExpectedRefreshFailure =
    requestUrl.startsWith('/api/v1/auth/refresh') && normalized.statusCode === 401;

  const safeMessage =
    normalized.statusCode >= 500 || !normalized.isAppError
      ? '서버 내부 오류가 발생했습니다.'
      : normalized.message;

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
  } else if (isExpectedRefreshFailure) {
    logger.debug('[API ERROR]', logPayload);
  } else {
    logger.warn('[API ERROR]', logPayload);
  }

  res.status(normalized.statusCode).json({
    error: safeMessage,
    code: normalized.code,
    statusCode: normalized.statusCode,
    requestId: req.requestId ?? null,
  });
};

export default errorHandler;
