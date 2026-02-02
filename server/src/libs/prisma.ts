// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ============================================
// pg Pool 직접 생성 (연결 풀 옵션 제어)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // 최대 연결 수
  min: 0,
  connectionTimeoutMillis: 30000, // 연결 획득 대기 30초 (부하 대응)
  idleTimeoutMillis: 30000, // 유휴 연결 30초 후 해제 (리소스 효율)
});

// Pool 에러 핸들링 (연결 실패 시 로깅)
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

// Prisma 7 PrismaPg 어댑터
const adapter = new PrismaPg(pool);

// 기본 Prisma Client (extension 적용 전)
const basePrisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ============================================
// 일시적 에러 판별 (재시도 대상)
// ============================================
const TRANSIENT_ERROR_PATTERNS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'Connection terminated',
  "Can't reach database server",
  'connection is closed',
] as const;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '');
  return TRANSIENT_ERROR_PATTERNS.some((p) => message.includes(p));
}

// ============================================
// 가벼운 재시도 Extension (1회만)
// ============================================
const prismaWithRetry = basePrisma.$extends({
  name: 'lightRetry',
  query: {
    $allOperations: async ({ operation, args, query }) => {
      try {
        return await query(args);
      } catch (error) {
        if (!isTransientError(error)) {
          throw error;
        }

        // Write 작업은 재시도 안 함 (중복 방지)
        const WRITE_OPS = [
          'create',
          'createMany',
          'update',
          'updateMany',
          'delete',
          'deleteMany',
          'upsert',
        ];
        if (WRITE_OPS.includes(operation)) {
          throw error;
        }

        // eslint-disable-next-line no-console
        console.warn(`[DB Retry] ${operation} failed, retrying once...`);

        await new Promise((r) => setTimeout(r, 100));
        return await query(args);
      }
    },
  },
});

// 전역 선언 (개발 환경 커넥션 누수 방지)
const globalForPrisma = global as unknown as {
  prisma: typeof prismaWithRetry;
  pool: Pool;
};

export const prisma = globalForPrisma.prisma || prismaWithRetry;
export { pool };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

// ============================================
// 연결 상태 모니터링
// ============================================
export function logPoolStatus(): void {
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Status:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
}

// ============================================
// Heartbeat 제거됨
// ============================================
// min: 1 설정으로 항상 1개 연결 유지 (첫 요청 즉시 응답)
// Heartbeat는 1개 연결만 보호하므로 비효율적 (하루 360번 불필요한 쿼리)
// idleTimeoutMillis: 30초로 자동 정리하여 리소스 효율 확보

// ============================================
// 연결 풀 정리 (앱 종료 시)
// ============================================
export async function closePool(): Promise<void> {
  await basePrisma.$disconnect();
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Closed');
}

export default prisma;
