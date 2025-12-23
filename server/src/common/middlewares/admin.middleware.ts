// server/src/common/middlewares/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';

/**
 * 관리자(일반 + 슈퍼) 권한 체크
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user; // 전역 선언 덕분에 타입이 잡힙니다.
  if (!user || !user.isAdmin) {
    return next(new AppError('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
  }
  next();
}

/**
 * 슈퍼 관리자 전용 권한 체크
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user || user.adminLevel !== 'SUPER') {
    return next(new AppError('슈퍼 관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
  }
  next();
}
