// server/src/libs/prisma.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Prisma 7 권장 방식: connectionString만 전달
// Supabase Supavisor 사용 시 connection pooling은 서버 측에서 관리됨
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// 전역 선언을 통해 개발 환경에서 재시작 시 커넥션 누수를 방지합니다.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
