// server/src/libs/prisma.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Prisma 7 권장 방식: connectionString만 전달
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// 기본 Prisma Client 생성 (내부용)
const basePrisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ============================================
// 재연결 락 (동시 재연결 경쟁 상태 방지)
// ============================================
let reconnecting: Promise<void> | null = null;
let lastReconnectTime = 0;
const RECONNECT_COOLDOWN_MS = 3000; // 3초 쿨다운

// 간단한 sleep 헬퍼
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 재연결을 단일화하는 함수 (뮤텍스 패턴 + 쿨다운)
 * - 이미 reconnect 중이면 그 Promise를 기다림
 * - 쿨다운 중이면 남은 시간만큼 기다렸다가 reconnect 시도
 */
async function reconnectOnce(): Promise<void> {
  // 이미 reconnect 중이면 그걸 기다림
  if (reconnecting) {
    return reconnecting;
  }

  // 쿨다운 체크: 남은 시간이 있으면 기다렸다가 reconnect
  const now = Date.now();
  const remain = RECONNECT_COOLDOWN_MS - (now - lastReconnectTime);
  if (remain > 0) {
    // eslint-disable-next-line no-console
    console.log(`[DB Reconnect] Cooldown active, waiting ${remain}ms...`);
    await sleep(remain);
  }

  // sleep 후 다시 체크 (다른 요청이 먼저 reconnect 시작했을 수 있음)
  if (reconnecting) {
    return reconnecting;
  }

  reconnecting = (async () => {
    try {
      lastReconnectTime = Date.now();
      // eslint-disable-next-line no-console
      console.log('[DB Reconnect] Starting reconnection...');
      await basePrisma.$disconnect().catch(() => {});
      await basePrisma.$connect();
      // eslint-disable-next-line no-console
      console.log('[DB Reconnect] Reconnected successfully');
    } finally {
      reconnecting = null;
    }
  })();

  return reconnecting;
}

// ============================================
// 재시도 가능한 에러 판별
// ============================================
const TRANSIENT_ERROR_PATTERNS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'Connection terminated',
  "Can't reach database server",
  'server closed the connection',
  'connection is closed',
  'socket closed',
  'This socket has been ended',
] as const;

const TRANSIENT_PRISMA_CODES = ['P1001', 'P1002', 'P1008', 'P1017'] as const;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as { message?: string; code?: string };
  const message = String(err.message || '');
  const code = err.code || '';

  const hasTransientPattern = TRANSIENT_ERROR_PATTERNS.some((p) => message.includes(p));
  const hasTransientCode = TRANSIENT_PRISMA_CODES.some((c) => c === code);

  return hasTransientPattern || hasTransientCode;
}

// ============================================
// Prisma Extension: 모든 쿼리에 자동 재시도 적용
// ============================================
// $allOperations로 모든 DB 작업을 가로채서 재시도 로직 적용
// 기존 서비스 코드 변경 없이 모든 쿼리에 적용됨

const prismaWithRetry = basePrisma.$extends({
  name: 'retryExtension',
  query: {
    $allOperations: async ({ operation, args, query }) => {
      const MAX_RETRIES = 1;

      // 재시도하면 안 되는 작업들
      const WRITE_OPERATIONS = [
        'create',
        'createMany',
        'update',
        'updateMany',
        'delete',
        'deleteMany',
        'upsert',
      ];

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          // 일시적 에러가 아니거나 마지막 시도면 throw
          if (!isTransientError(error) || attempt === MAX_RETRIES) {
            throw error;
          }

          // Write 쿼리는 재시도하지 않음 (중복 데이터 방지)
          // 참고: 트랜잭션 내부 쿼리도 일반 operation으로 들어오므로 별도 체크 불가
          if (WRITE_OPERATIONS.includes(operation)) {
            throw error;
          }

          // eslint-disable-next-line no-console
          console.warn(
            `[DB Auto-Retry] Transient error on ${operation}, reconnecting (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );

          // 락 기반 재연결
          await reconnectOnce().catch(() => {});
        }
      }

      // 여기 도달하면 안 됨
      throw new Error('[DB Auto-Retry] Unexpected state');
    },
  },
});

// 전역 선언을 통해 개발 환경에서 재시작 시 커넥션 누수를 방지
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
      // basePrisma 사용 (extension 우회하여 직접 쿼리)
      await basePrisma.$queryRaw`SELECT 1`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DB Heartbeat] Connection check failed:', error);
      await reconnectOnce().catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[DB Heartbeat] Reconnect failed:', e);
      });
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

// ============================================
// 수동 재시도 래퍼 (필요시 사용)
// ============================================
// Extension이 모든 쿼리에 적용되므로 일반적으로 불필요
// 특수한 경우(더 많은 재시도 등)에만 사용

export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isTransientError(error) || attempt === maxRetries) {
        break;
      }

      // eslint-disable-next-line no-console
      console.warn(
        `[DB Retry] Transient error, reconnecting (attempt ${attempt + 1}/${maxRetries})`,
      );
      await reconnectOnce().catch(() => {});
    }
  }

  throw lastError;
}

export default prisma;
