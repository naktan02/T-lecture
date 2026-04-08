import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

interface RequestContextStore {
  requestId: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

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

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = normalizeRequestId(
    readHeader(req.headers['x-request-id']) ?? readHeader(req.headers['x-correlation-id']),
  );

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  requestContextStorage.run({ requestId }, () => {
    next();
  });
};

export default requestContext;
