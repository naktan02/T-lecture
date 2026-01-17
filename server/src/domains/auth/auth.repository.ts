// server/src/domains/auth/auth.repository.ts
import prisma from '../../libs/prisma';
import { Prisma } from '../../generated/prisma/client.js';

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

  async saveRefreshToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    deviceId: string | null,
  ) {
    // 동시 로그인 시 race condition 방지를 위해 try-catch 사용
    // 1. 먼저 기존 토큰 삭제 시도
    if (deviceId) {
      await prisma.refreshToken.deleteMany({
        where: { userId, deviceId },
      });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    // 2. 새 토큰 생성 시도 (중복 시 업데이트)
    try {
      return await prisma.refreshToken.create({
        data: {
          userId,
          token: tokenHash,
          expiresAt,
          deviceId,
        },
      });
    } catch (error: unknown) {
      // P2002: Unique constraint violation - 동시 로그인으로 인한 중복
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        // 이미 존재하면 업데이트
        return await prisma.refreshToken.updateMany({
          where: { userId, deviceId },
          data: { token: tokenHash, expiresAt },
        });
      }
      throw error;
    }
  }

  // 리프레시 토큰 조회 (해시로 조회)
  async findRefreshToken(tokenHash: string) {
    return await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });
  }

  // 리프레시 토큰 삭제 (Rotation용)
  async deleteByTokenHash(tokenHash: string) {
    return await prisma.refreshToken.delete({
      where: { token: tokenHash },
    });
  }

  // 리프레시 토큰 삭제 (로그아웃)
  async deleteRefreshToken(userId: number, deviceId: string | null) {
    const whereCondition: Prisma.RefreshTokenWhereInput = { userId };
    // 기기 ID가 넘어왔으면 조건에 추가 -> 내 기기만 삭제됨
    if (deviceId) {
      whereCondition.deviceId = deviceId;
    }
    // deviceId가 없으면? -> whereCondition이 { userId }만 남으므로 '전체 로그아웃'이 됨
    return await prisma.refreshToken.deleteMany({
      where: whereCondition,
    });
  }
}

export default new AuthRepository();
