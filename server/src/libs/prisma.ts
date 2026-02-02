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
  max: 20,                       // 최대 연결 수
  min: 0,                        // 최소 연결 수 (lazy connection - 필요시에만 연결)
  idleTimeoutMillis: 30000,      // 유휴 연결 30초 후 해제
  connectionTimeoutMillis: 10000, // 연결 타임아웃 10초 (Render↔Supabase 네트워크 지연 대응)
});

// ============================================
// Pool 이벤트 로깅 (연결 상태 추적)
// ============================================

// 새 연결 생성 시
pool.on('connect', () => {
  // eslint-disable-next-line no-console
  console.log('[DB Pool] New connection established', {
    timestamp: new Date().toISOString(),
    total: pool.totalCount,
    idle: pool.idleCount,
  });
});

// 연결이 풀에서 제거될 때
pool.on('remove', () => {
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Connection removed', {
    timestamp: new Date().toISOString(),
    total: pool.totalCount,
    idle: pool.idleCount,
  });
});

// 연결 획득 시 (풀에서 클라이언트 가져올 때)
pool.on('acquire', () => {
  // eslint-disable-next-line no-console
  console.debug('[DB Pool] Connection acquired', {
    timestamp: new Date().toISOString(),
    waiting: pool.waitingCount,
  });
});

// 연결 반환 시 (클라이언트가 풀로 돌아올 때)
pool.on('release', () => {
  // eslint-disable-next-line no-console
  console.debug('[DB Pool] Connection released', {
    timestamp: new Date().toISOString(),
    idle: pool.idleCount,
  });
});

// Pool 에러 핸들링 (상세 정보 포함)
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[DB Pool] Unexpected error on idle client:', {
    message: err.message,
    code: (err as NodeJS.ErrnoException).code,
    timestamp: new Date().toISOString(),
    stack: err.stack,
    poolStatus: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
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

        // 재시도 로직 (최대 2회, exponential backoff)
        const retryDelays = [500, 1500]; // 500ms, 1500ms 대기

        for (let attempt = 0; attempt < retryDelays.length; attempt++) {
          // eslint-disable-next-line no-console
          console.warn(`[DB Retry] 🔄 ${modelName}.${operation} - Retry ${attempt + 1}/${retryDelays.length}...`);

          await new Promise((r) => setTimeout(r, retryDelays[attempt]));

          try {
            const result = await query(args);
            // eslint-disable-next-line no-console
            console.log(`[DB Retry] ✅ ${modelName}.${operation} - Retry ${attempt + 1} succeeded`);
            return result;
          } catch (retryError) {
            const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
            // eslint-disable-next-line no-console
            console.error(`[DB Retry] ❌ ${modelName}.${operation} - Retry ${attempt + 1} failed:`, retryMsg);

            if (attempt === retryDelays.length - 1) {
              throw retryError;
            }
          }
        }

        throw error; // fallback (도달하지 않음)
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