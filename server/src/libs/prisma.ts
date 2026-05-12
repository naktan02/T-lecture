// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

// ============================================
// pg Pool 직접 생성 (연결 풀 옵션 제어)
// ============================================
const DEFAULT_DB_POOL_MAX = 9;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;

  return parsed;
}

const dbPoolMax = parsePositiveInteger(process.env.DB_POOL_MAX, DEFAULT_DB_POOL_MAX);

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

function createPool(): Pool {
  const nextPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: dbPoolMax, // Aiven Free(20 connections)에서는 Render 1 instance 기준 8~9 권장
    min: 0,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    ssl: process.env.DATABASE_URL?.includes('localhost')
      ? false
      : {
          rejectUnauthorized: true,
          // 파일 경로로부터 인증서 내용을 읽어옵니다.
          ca: process.env.AIVEN_CA_CERT
            ? fs.readFileSync(path.resolve(process.cwd(), process.env.AIVEN_CA_CERT)).toString()
            : undefined,
        },
  });

  nextPool.on('error', (err) => {
    logger.error('[DB Pool] Unexpected error on idle client', {
      message: err.message,
    });
  });

  return nextPool;
}

function createPrismaBundle(clientPool: Pool) {
  const adapter = new PrismaPg(clientPool);
  const base = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  const extended = base.$extends({
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
              logger.error('[DB Retry] Operation failed after retries', {
                operation,
                maxRetries: MAX_RETRIES,
              });
              throw error;
            }

            // 지수 백오프로 재시도
            const delay = RETRY_DELAYS[attempt] || 2000;
            logger.warn('[DB Retry] Retrying transient database operation', {
              operation,
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES,
              delayMs: delay,
            });
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        throw lastError;
      },
    },
  });

  return { base, extended };
}

type PrismaBundle = ReturnType<typeof createPrismaBundle>;

// 전역 선언 (개발 환경 커넥션 누수 방지)
const globalForPrisma = global as unknown as {
  prismaBundle?: PrismaBundle;
  pool?: Pool;
};

const pool = globalForPrisma.pool || createPool();
const prismaBundle = globalForPrisma.prismaBundle || createPrismaBundle(pool);
const basePrisma = prismaBundle.base;
export const prisma = prismaBundle.extended;
export { pool };

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBundle = prismaBundle;
  globalForPrisma.pool = pool;
}

// ============================================
// 연결 상태 모니터링
// ============================================
export function logPoolStatus(): void {
  logger.debug('[DB Pool] Status', {
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
      logger.debug('[DB Heartbeat] OK', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    } catch {
      logger.warn('[DB Heartbeat] Connection check failed, will auto-recover');
    }
  }, HEARTBEAT_INTERVAL_MS);

  logger.debug('[DB Heartbeat] Started', { intervalMs: HEARTBEAT_INTERVAL_MS });
}

export function stopDatabaseHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    logger.debug('[DB Heartbeat] Stopped');
  }
}

// ============================================
// 연결 풀 정리 (앱 종료 시)
// ============================================
export async function closePool(): Promise<void> {
  stopDatabaseHeartbeat();
  await basePrisma.$disconnect();
  await pool.end();
  logger.debug('[DB Pool] Closed');
}

export default prisma;
