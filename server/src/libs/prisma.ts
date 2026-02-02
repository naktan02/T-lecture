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
  
  // 1. [핵심] 4000ms는 깁니다. 0으로 설정해서 "사용 안 하면 즉시 폐기" 하세요.
  // 이렇게 해야 '죽은 연결'을 만날 확률이 0%가 됩니다.
  idleTimeoutMillis: 0, 
  
  // 2. [핵심] 4개는 너무 적습니다. 15개로 늘리세요.
  // 15개 연결 객체는 메모리 몇 MB도 안 씁니다. Render 무료도 충분합니다.
  max: 15, 
  
  min: 0,
  connectionTimeoutMillis: 5000, // 대기 5초
  keepAlive: false, 
  query_timeout: 10000, 
  allowExitOnIdle: true,
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