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
  // ============================================
  // Supavisor(6543) Transaction Mode 최적화 설정
  // ============================================
  
  // 1. [핵심] 연결 유지 시간: 0.1초 (극단적으로 짧게)
  // 4000(4초)도 깁니다. 100ms(0.1초)만 지나면 바로 버리게 해서 
  // '죽은 연결'을 아예 안 들고 있게 만듭니다.
  idleTimeoutMillis: 100, 
  
  // 2. [핵심] 최대 연결 수: 20개 (과감하게 늘리기)
  // Supabase 6543 포트는 수천 개의 연결도 받아줍니다. 
  // 4개는 너무 적어서 병목이 오니 20개로 넉넉히 뚫어주세요.
  max: 20, 
  min: 0,
  
  // 3. 연결 대기 타임아웃
  // 풀이 꽉 찼을 때 5초만 기다리고 빨리 에러를 뱉어서 재시도를 유도합니다.
  connectionTimeoutMillis: 5000, 
  
  // 4. 기타 필수 설정
  keepAlive: false, // Transaction Mode 필수
  query_timeout: 10000, // 10초 이상 걸리는 쿼리는 강제 종료
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