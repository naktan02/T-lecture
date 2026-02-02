// server/src/libs/prisma.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ============================================
// pg Pool 吏곸젒 ?앹꽦 (?곌껐 ? ?듭뀡 ?쒖뼱)
// ============================================

// ?뵇 DEBUG: DATABASE_URL ?뺤씤 (?ы듃? pgbouncer ?뚮씪誘명꽣 泥댄겕)
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
  // Supavisor(6543) Transaction Mode 理쒖쟻??
  // ============================================
  
  // 1. ?곌껐 ?좎? ?쒓컙 理쒖냼??(媛??以묒슂)
  // ?곌껐??1珥??댁긽 ?ъ슜?섏? ?딆쑝硫?利됱떆 踰꾨젮??'醫鍮??곌껐'???섎뒗 寃껋쓣 留됱뒿?덈떎.
  idleTimeoutMillis: 4000, // (湲곗〈 10000 -> 1000)
  
  // 2. Keep-Alive 鍮꾪솢?깊솕
  // Transaction Mode?먯꽌???댁감???곌껐???먯＜ 諛붾뚮?濡?遺덊븘?뷀븳 ?⑦궥??以꾩엯?덈떎.
  keepAlive: false, 
  
  // 3. ?곌껐 ??꾩븘???⑥텞
  // ?곌껐?????≫엳硫?鍮⑤━ ?ㅽ뙣?섍퀬 ?ъ떆??Retry) 濡쒖쭅?????寃??レ뒿?덈떎.
  connectionTimeoutMillis: 15000, // (30珥?-> 5珥?
  
  // 4. 理쒕? ?곌껐 ??議곗젙
  // Render ?쒕쾭媛 ?섎굹?쇰㈃ 10~15 ?뺣룄媛 ?곷떦?⑸땲?? 
  // Transaction Mode???뚯쟾?⑥씠 鍮⑤씪???レ옄媛 ?묒븘??泥섎━?됱씠 ?믪뒿?덈떎.
  max: 4, 
  min: 0,
  
  // 5. 荑쇰━ ??꾩븘??
  // 荑쇰━媛 ?덈Т ?ㅻ옒 嫄몃━硫?10珥? 洹몃깷 ?딆뼱踰꾨┰?덈떎. (臾댄븳 ?湲?諛⑹?)
  query_timeout: 15000, 
  
  allowExitOnIdle: true,
});

// Pool ?먮윭 ?몃뱾留?(?곌껐 ?ㅽ뙣 ??濡쒓퉭)
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

// Prisma 7 PrismaPg ?대뙌??
const adapter = new PrismaPg(pool);

// 湲곕낯 Prisma Client (extension ?곸슜 ??
const basePrisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ============================================
// ?쇱떆???먮윭 ?먮퀎 (?ъ떆?????
// ============================================
const TRANSIENT_ERROR_PATTERNS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'Connection terminated',
  "Can't reach database server",
  'connection is closed',
  'Query read timeout', // ?몚 異붽?
] as const;

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: string }).message || '');
  return TRANSIENT_ERROR_PATTERNS.some((p) => message.includes(p));
}

// ============================================
// 媛踰쇱슫 ?ъ떆??Extension (1?뚮쭔)
// ============================================
const prismaWithRetry = basePrisma.$extends({
  name: 'lightRetry',
  query: {
    $allOperations: async ({ operation, args, query, model }) => {
      try {
        return await query(args);
      } catch (error) {
        // ?먮윭 ?뺣낫 ?곸꽭 濡쒓퉭
        const errorMessage = error instanceof Error ? error.message : String(error);
        const modelName = model || 'unknown';

        // eslint-disable-next-line no-console
        console.error(`[DB ERROR] ${modelName}.${operation} failed:`, {
          model: modelName,
          operation,
          error: errorMessage,
          args: JSON.stringify(args).slice(0, 200), // 泥섏쓬 200?먮쭔 (?덈Т 湲몄? ?딄쾶)
        });

        if (!isTransientError(error)) {
          throw error;
        }

        // Write ?묒뾽? ?ъ떆??????(以묐났 諛⑹?)
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
          console.warn(`[DB Retry] ??${modelName}.${operation} - Write operation, not retrying`);
          throw error;
        }

        // eslint-disable-next-line no-console
        console.warn(`[DB Retry] ?봽 ${modelName}.${operation} - Retrying once...`);

        await new Promise((r) => setTimeout(r, 300));

        try {
          const result = await query(args);
          // eslint-disable-next-line no-console
          console.log(`[DB Retry] ??${modelName}.${operation} - Retry succeeded`);
          return result;
        } catch (retryError) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : String(retryError);
          // eslint-disable-next-line no-console
          console.error(
            `[DB Retry] ??${modelName}.${operation} - Retry also failed:`,
            retryErrorMessage,
          );
          throw retryError;
        }
      }
    },
  },
});

// ?꾩뿭 ?좎뼵 (媛쒕컻 ?섍꼍 而ㅻ꽖???꾩닔 諛⑹?)
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
// ?곌껐 ?곹깭 紐⑤땲?곕쭅
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
// ?곌껐 ? ?뺣━ (??醫낅즺 ??
// ============================================
export async function closePool(): Promise<void> {
  await basePrisma.$disconnect();
  await pool.end();
  // eslint-disable-next-line no-console
  console.log('[DB Pool] Closed');
}

export default prisma;
