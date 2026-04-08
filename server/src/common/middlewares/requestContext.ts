import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestDbMetrics {
  dbQueryCount: number;
  totalDbMs: number;
  maxDbQueryMs: number;
  slowDbQueryCount: number;
}

interface RequestContextStore {
  requestId: string;
  dbMetrics: RequestDbMetrics;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

function createRequestDbMetrics(): RequestDbMetrics {
  return {
    dbQueryCount: 0,
    totalDbMs: 0,
    maxDbQueryMs: 0,
    slowDbQueryCount: 0,
  };
}

function normalizeRequestId(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return randomUUID();
  return trimmed.replace(/[^\w\-.:/]/g, '').slice(0, 128) || randomUUID();
}

function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find(Boolean);
  }
  return value;
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

export function getRequestDbMetrics(): RequestDbMetrics | undefined {
  return requestContextStorage.getStore()?.dbMetrics;
}

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = normalizeRequestId(
    readHeader(req.headers['x-request-id']) ?? readHeader(req.headers['x-correlation-id']),
  );
  const dbMetrics = createRequestDbMetrics();

  req.requestId = requestId;
  req.dbMetrics = dbMetrics;
  res.setHeader('X-Request-Id', requestId);

  requestContextStorage.run({ requestId, dbMetrics }, () => {
    next();
  });
};

export default requestContext;
