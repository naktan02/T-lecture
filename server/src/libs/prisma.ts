// server/src/libs/prisma.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Prisma 7 PrismaPg 어댑터 + 연결 풀 옵션
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 10, // 최대 연결 수
  connectionTimeoutMillis: 30000, // 연결 획득 대기 타임아웃 30초
  idleTimeoutMillis: 0, // 유휴 연결 해제 비활성화 (Supavisor가 관리)
});

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
// - $disconnect/$connect 호출 안 함 (PrismaPg가 자동 처리)
// - 짧은 대기 후 재시도 → 사용자는 딜레이로만 느낌

const prismaWithRetry = basePrisma.$extends({
  name: 'lightRetry',
  query: {
    $allOperations: async ({ operation, args, query }) => {
      try {
        return await query(args);
      } catch (error) {
        // 일시적 에러가 아니면 바로 throw
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

        // 100ms 대기 후 재시도 (PrismaPg가 새 연결 자동 생성)
        await new Promise((r) => setTimeout(r, 100));
        return await query(args);
      }
    },
  },
});

// 전역 선언 (개발 환경 커넥션 누수 방지)
const globalForPrisma = global as unknown as { prisma: typeof prismaWithRetry };

export const prisma = globalForPrisma.prisma || prismaWithRetry;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// Supavisor Heartbeat (5분 유휴 타임아웃 방지)
// ============================================
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4분
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startDatabaseHeartbeat(): void {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(async () => {
    try {
      await basePrisma.$queryRaw`SELECT 1`;
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[DB Heartbeat] Connection check failed, will auto-recover');
    }
  }, HEARTBEAT_INTERVAL_MS);

  // eslint-disable-next-line no-console
  console.log('[DB Heartbeat] Started (interval: 4 minutes)');
}

export function stopDatabaseHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    // eslint-disable-next-line no-console
    console.log('[DB Heartbeat] Stopped');
  }
}

export default prisma;
