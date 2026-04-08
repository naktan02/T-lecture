import { Request } from 'express';

export function getRoutePattern(req: Request): string | null {
  const routePath = req.route?.path;
  if (!routePath) return null;

  if (typeof routePath === 'string') {
    return `${req.baseUrl || ''}${routePath}`;
  }

  return req.baseUrl || null;
}

export function getRequestMeta(req: Request): Record<string, unknown> {
  return {
    requestId: req.requestId ?? null,
    userId: req.user?.id ?? null,
    method: req.method,
    url: req.originalUrl || req.url,
    route: getRoutePattern(req),
  };
}
