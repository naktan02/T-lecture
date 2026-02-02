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
  // Supavisor(6543) Transaction Mode 최적화
  // ============================================
  
  // 1. 연결 유지 시간 최소화 (가장 중요)
  // 연결을 1초 이상 사용하지 않으면 즉시 버려서 '좀비 연결'이 되는 것을 막습니다.
  idleTimeoutMillis: 2000, // (기존 10000 -> 1000)
  
  // 2. Keep-Alive 비활성화
  // Transaction Mode에서는 어차피 연결이 자주 바뀌므로 불필요한 패킷을 줄입니다.
  keepAlive: false, 
  
  // 3. 연결 타임아웃 단축
  // 연결이 안 잡히면 빨리 실패하고 재시도(Retry) 로직을 타는 게 낫습니다.
  connectionTimeoutMillis: 15000, // (30초 -> 5초)
  
  // 4. 최대 연결 수 조정
  // Render 서버가 하나라면 10~15 정도가 적당합니다. 
  // Transaction Mode는 회전율이 빨라서 숫자가 작아도 처리량이 높습니다.
  max: 2, 
  min: 0,
  
  // 5. 쿼리 타임아웃
  // 쿼리가 너무 오래 걸리면(10초) 그냥 끊어버립니다. (무한 대기 방지)
  query_timeout: 10000, 
  
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
