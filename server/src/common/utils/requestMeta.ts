import { Request } from 'express';

export function getRoutePattern(req: Request): string | null {
  const routePath = req.route?.path;
  if (!routePath) return null;

  if (typeof routePath === 'string') {
    return `${req.baseUrl || ''}${routePath}`;
  }

  return req.baseUrl || null;
}

export function getLoggableUrl(req: Request): string {
  const fullUrl = req.originalUrl || req.url || '';
  const queryIndex = fullUrl.indexOf('?');

  return queryIndex >= 0 ? fullUrl.slice(0, queryIndex) : fullUrl;
}

export function getRequestMeta(req: Request): Record<string, unknown> {
  return {
    requestId: req.requestId ?? null,
    userId: req.user?.id ?? null,
    method: req.method,
    url: getLoggableUrl(req),
    route: getRoutePattern(req),
  };
}
