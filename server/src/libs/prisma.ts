// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ============================================
// pg Pool 직접 생성 (연결 풀 옵션 제어)
// ============================================

const dbUrl = process.env.DATABASE_URL || '';
const urlPort = dbUrl.match(/:(\d+)\//)?.[1];
const hasPgBouncer = dbUrl.includes('pgbouncer=true');

// eslint-disable-next-line no-console
console.log('[DB Pool] Connection setup:', {
  port: urlPort,
  usesTransactionPooler: urlPort === '6543' && hasPgBouncer,
  hasPgBouncerParam: hasPgBouncer,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // 최대 연결 수
  min: 2,                     // 최소 연결 수
  idleTimeoutMillis: 30000,   // 유휴 연결 타임아웃
  connectionTimeoutMillis: 2000, // 연결 타임아웃
});

// Pool 에러 핸들링
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ============================================
// 재시도 로직 (그대로 유지)
// ============================================
const TRANSIENT_ERROR_PATTERNS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'Connection terminated',
  "Can't reach database server",
  'connection is closed',
  'Query read timeout',
  'timeout exceeded when trying to connect', // 👈 이것도 재시도 대상에 추가하면 좋습니다
] as const;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '');
  return TRANSIENT_ERROR_PATTERNS.some((p) => message.includes(p));
}

const prismaWithRetry = basePrisma.$extends({
  name: 'lightRetry',
  query: {
    $allOperations: async ({ operation, args, query, model }) => {
      try {
        return await query(args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const modelName = model || 'unknown';

        // eslint-disable-next-line no-console
        console.error(`[DB ERROR] ${modelName}.${operation} failed:`, {
          model: modelName,
          operation,
          error: errorMessage,
          // args는 로그 너무 길어질 수 있으니 필요 시 주석 처리
        });

        if (!isTransientError(error)) {
          throw error;
        }

        const WRITE_OPS = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'];
        if (WRITE_OPS.includes(operation)) {
          throw error;
        }

        // eslint-disable-next-line no-console
        console.warn(`[DB Retry] 🔄 ${modelName}.${operation} - Retrying once...`);

        // 재시도 대기 시간을 조금 더 짧게 (300ms -> 100ms) 줄여서 반응성을 높임
        await new Promise((r) => setTimeout(r, 100));

        try {
          return await query(args);
        } catch (retryError) {
          const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
          // eslint-disable-next-line no-console
          console.error(`[DB Retry] ❌ ${modelName}.${operation} - Retry failed:`, retryMsg);
          throw retryError;
        }
      }
    },
  },
});

const globalForPrisma = global as unknown as { prisma: typeof prismaWithRetry; pool: Pool };
export const prisma = globalForPrisma.prisma || prismaWithRetry;
export { pool };
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export function logPoolStatus(): void {
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Status:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}

export async function closePool(): Promise<void> {
  await basePrisma.$disconnect();
  await pool.end();
}

export default prisma;