// server/src/libs/prisma.ts
import { PrismaClient } from '@prisma/client';

// 전역 선언을 통해 개발 환경에서 재시작 시 커넥션 누수를 방지합니다.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = prisma;
module.exports.prisma = prisma;
