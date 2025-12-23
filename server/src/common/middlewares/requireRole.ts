// server/src/common/middlewares/requireRole.ts
import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';

/**
 * 역할별 접근 제한 미들웨어
 */
export function requireRole(requiredRole: 'ADMIN' | 'INSTRUCTOR' | string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new AppError('인증이 필요합니다.', 401, 'UNAUTHORIZED'));
    }

    if (requiredRole === 'ADMIN') {
      if (!user.isAdmin) {
        return next(new AppError('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
      }
      return next();
    }

    if (requiredRole === 'INSTRUCTOR') {
      if (!user.isInstructor) {
        return next(new AppError('강사만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
      }
      return next();
    }

    // 기존 로직 유지: 기타 커스텀 역할 체크
    if ((user as any).role !== requiredRole) {
      return next(new AppError('권한이 없습니다.', 403, 'FORBIDDEN'));
    }

    next();
  };
}

export default requireRole;