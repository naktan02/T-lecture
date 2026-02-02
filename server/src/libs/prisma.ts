// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ============================================
// pg Pool 직접 생성 (연결 풀 옵션 제어)
// ============================================

// 🔍 DEBUG: DATABASE_URL 확인 (포트와 pgbouncer 파라미터 체크)
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
  // Supavisor 최적화 설정
  // ============================================
  max: 5, // 최대 연결 수 (Supavisor 제한 고려)
  min: 0, // 유휴 연결 없음
  idleTimeoutMillis: 10000, // 유휴 연결 10초 후 해제
  connectionTimeoutMillis: 30000, // 연결 획득 대기 30초 (여유 확보)
  // TCP keepalive 활성화
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10초 후 keepalive 시작
  // 쿼리 타임아웃 설정
  query_timeout: 30000, // 개별 쿼리 최대 30초
  statement_timeout: 30000, // SQL statement 최대 30초
  // 유휴 시 앱 종료 허용
  allowExitOnIdle: true,
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
  'Query read timeout', // 👈 추가
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
    $allOperations: async ({ operation, args, query, model }) => {
      try {
        return await query(args);
      } catch (error) {
        // 에러 정보 상세 로깅
        const errorMessage = error instanceof Error ? error.message : String(error);
        const modelName = model || 'unknown';

        // eslint-disable-next-line no-console
        console.error(`[DB ERROR] ${modelName}.${operation} failed:`, {
          model: modelName,
          operation,
          error: errorMessage,
          args: JSON.stringify(args).slice(0, 200), // 처음 200자만 (너무 길지 않게)
        });

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
          // eslint-disable-next-line no-console
          console.warn(`[DB Retry] ❌ ${modelName}.${operation} - Write operation, not retrying`);
          throw error;
        }

        // eslint-disable-next-line no-console
        console.warn(`[DB Retry] 🔄 ${modelName}.${operation} - Retrying once...`);

        await new Promise((r) => setTimeout(r, 100));

        try {
          const result = await query(args);
          // eslint-disable-next-line no-console
          console.log(`[DB Retry] ✅ ${modelName}.${operation} - Retry succeeded`);
          return result;
        } catch (retryError) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : String(retryError);
          // eslint-disable-next-line no-console
          console.error(
            `[DB Retry] ❌ ${modelName}.${operation} - Retry also failed:`,
            retryErrorMessage,
          );
          throw retryError;
        }
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
// 연결 풀 정리 (앱 종료 시)
// ============================================
export async function closePool(): Promise<void> {
  await basePrisma.$disconnect();
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Closed');
}

export default prisma;
