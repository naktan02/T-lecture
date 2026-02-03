// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ============================================
// pg Pool 직접 생성 (연결 풀 옵션 제어)
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30, // 최대 연결 수
  min: 0, // 최소 연결 수
  idleTimeoutMillis: 60000, // 유휴 연결 60초 후 해제
  connectionTimeoutMillis: 30000, // 연결 획득 대기 30초 (무료 티어 지연 대응)
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
// 재시도 Extension (무료 티어 대응: 3회 + 지수 백오프)
// ============================================
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // 500ms, 1s, 2s

const prismaWithRetry = basePrisma.$extends({
  name: 'robustRetry',
  query: {
    $allOperations: async ({ operation, args, query }) => {
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
      const isWriteOp = WRITE_OPS.includes(operation);

      let lastError: unknown;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          lastError = error;

          // Write 작업이거나 일시적 에러가 아니면 즉시 throw
          if (isWriteOp || !isTransientError(error)) {
            throw error;
          }

          // 마지막 시도였으면 throw
          if (attempt >= MAX_RETRIES) {
            // eslint-disable-next-line no-console
            console.error(`[DB Retry] ${operation} failed after ${MAX_RETRIES} retries`);
            throw error;
          }

          // 지수 백오프로 재시도
          const delay = RETRY_DELAYS[attempt] || 2000;
          // eslint-disable-next-line no-console
          console.warn(
            `[DB Retry] ${operation} failed, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      throw lastError;
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
// Supavisor Heartbeat (5분 유휴 타임아웃 방지)
// ============================================
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2분 (무료 티어 안정성 강화)
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startDatabaseHeartbeat(): void {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(async () => {
    try {
      await basePrisma.$queryRaw`SELECT 1`;
      // eslint-disable-next-line no-console
      console.log('[DB Heartbeat] OK -', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[DB Heartbeat] Connection check failed, will auto-recover');
    }
  }, HEARTBEAT_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log('[DB Heartbeat] Started (interval: 2 minutes)');
}

export function stopDatabaseHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    // eslint-disable-next-line no-console
    console.log('[DB Heartbeat] Stopped');
  }
}

// ============================================
// 연결 풀 정리 (앱 종료 시)
// ============================================
export async function closePool(): Promise<void> {
  stopDatabaseHeartbeat();
  await basePrisma.$disconnect();
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Closed');
}

export default prisma;
