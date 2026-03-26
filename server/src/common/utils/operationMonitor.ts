import logger from '../../config/logger';
import { pool } from '../../libs/prisma';

interface MeasureOperationOptions<T> {
  warnThresholdMs?: number;
  meta?: Record<string, unknown>;
  summarizeResult?: (result: T) => Record<string, unknown> | undefined;
}

function getPoolSnapshot(): Record<string, number> {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export async function measureOperation<T>(
  name: string,
  fn: () => Promise<T>,
  options: MeasureOperationOptions<T> = {},
): Promise<T> {
  const startedAt = Date.now();
  const warnThresholdMs = options.warnThresholdMs ?? 5000;

  logger.info(`[OPERATION START] ${name}`, {
    ...(options.meta || {}),
    pool: getPoolSnapshot(),
  });

  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    const payload = {
      ...(options.meta || {}),
      ...(options.summarizeResult ? options.summarizeResult(result) || {} : {}),
      durationMs,
      pool: getPoolSnapshot(),
    };

    if (durationMs >= warnThresholdMs) {
      logger.warn(`[OPERATION SLOW] ${name}`, payload);
    } else {
      logger.info(`[OPERATION DONE] ${name}`, payload);
    }

    return result;
  } catch (error) {
    logger.warn(`[OPERATION FAIL] ${name}`, {
      ...(options.meta || {}),
      durationMs: Date.now() - startedAt,
      pool: getPoolSnapshot(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
