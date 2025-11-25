// server/src/domains/auth/auth.repository.js

const prisma = require('../../libs/prisma');

class AuthRepository {
  // 인증 코드 생성/저장
  async createVerificationCode(email, code, expiresAt) {
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
  async findLatestVerification(email) {
    return await prisma.emailVerification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 인증 완료 처리
  async markAsVerified(id) {
    return await prisma.emailVerification.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  // 인증 기록 삭제 (가입 완료 후 정리)
  async deleteVerifications(email) {
    return await prisma.emailVerification.deleteMany({
      where: { email },
    });
  }
}

module.exports = new AuthRepository();