// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// PostgreSQL 연결 풀 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// pg 어댑터 생성
const adapter = new PrismaPg(pool);

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
