// server/src/domains/auth/auth.repository.ts
import prisma from '../../libs/prisma';
import { Prisma } from '@prisma/client';

export class AuthRepository {
  // 인증 코드 생성/저장
  async createVerificationCode(email: string, code: string, expiresAt: Date) {
    return await prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
        isVerified: false,
      },
    });
  }

  // 최신 인증 기록 조회
  async findLatestVerification(email: string) {
    return await prisma.emailVerification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 인증 완료 처리
  async markAsVerified(id: number) {
    return await prisma.emailVerification.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  // 인증 기록 삭제 (가입 완료 후 정리)
  async deleteVerifications(email: string) {
    return await prisma.emailVerification.deleteMany({
      where: { email },
    });
  }

  //  리프레시 토큰 저장 (기존 토큰 삭제 후 저장)
  async saveRefreshToken(userId: number, token: string, expiresAt: Date, deviceId: string | null) {
    if (deviceId) {
      // 1. 기기 ID가 있으면 -> 해당 기기의 기존 토큰만 삭제
      await prisma.refreshToken.deleteMany({
        where: {
          userId,
          deviceId,
        },
      });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    return await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        deviceId,
      },
    });
  }

  // 리프레시 토큰 조회
  async findRefreshToken(userId: number, token: string) {
    return await prisma.refreshToken.findFirst({
      where: { userId, token },
    });
  }

  // 리프레시 토큰 삭제 (로그아웃)
  async deleteRefreshToken(userId: number, deviceId: string | null) {
    const whereCondition: Prisma.RefreshTokenWhereInput = { userId };
    // 기기 ID가 넘어왔으면 조건에 추가 -> 내 기기만 삭제됨
    if (deviceId) {
      whereCondition.deviceId = deviceId;
    }
    // deviceId가 없으면? -> whereCondition이 { userId }만 남으므로 '전체 로그아웃'이 됨 (의도된 동작으로 사용 가능)
    return await prisma.refreshToken.deleteMany({
      where: whereCondition,
    });
  }
}

export default new AuthRepository();
