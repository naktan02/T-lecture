// server/src/common/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../../libs/prisma';
import AppError from '../errors/AppError';
import type { UserStatus, AdminLevel } from '@prisma/client';

export interface AuthUser {
  id: number;
  status: UserStatus;
  name: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  adminLevel: AdminLevel | null;
  isInstructor: boolean;
}

interface JWTPayload {
  userId: number;
}

const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('인증 토큰이 없습니다.', 401, 'NO_AUTH_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    // ✅ 개선 1: 환경변수 런타임 체크 (as string 제거)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('서버 설정 오류: JWT_SECRET이 없습니다.', 500, 'JWT_SECRET_MISSING');
    }

    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, secret) as JWTPayload;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw new AppError('토큰이 만료되었습니다.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('유효하지 않은 토큰입니다.', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        status: true,
        name: true,
        userEmail: true,
        admin: { select: { level: true } },
        instructor: { select: { userId: true } },
      },
    });

    if (!user) {
      throw new AppError('존재하지 않는 사용자입니다.', 401, 'USER_NOT_FOUND');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('접근이 제한된 계정입니다.', 403, 'ACCOUNT_INACTIVE');
    }

    // ✅ 이제 Express.Request가 확장되었으므로 req.user에 바로 할당 가능합니다.
    req.user = {
      id: user.id,
      status: user.status,
      name: user.name,
      userEmail: user.userEmail,
      isAdmin: !!user.admin,
      adminLevel: user.admin?.level || null,
      isInstructor: !!user.instructor,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export default auth;
