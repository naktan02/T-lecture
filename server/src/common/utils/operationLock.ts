import logger from '../../config/logger';
import AppError from '../errors/AppError';

const activeOperations = new Map<string, number>();

interface ExclusiveOperationOptions {
  conflictMessage?: string;
}

export async function runExclusiveOperation<T>(
  key: string,
  fn: () => Promise<T>,
  options: ExclusiveOperationOptions = {},
): Promise<T> {
  const existingStartedAt = activeOperations.get(key);

  if (existingStartedAt) {
    logger.warn('[OPERATION LOCKED]', {
      operation: key,
      startedAt: new Date(existingStartedAt).toISOString(),
    });

    throw new AppError(
      options.conflictMessage ||
        '현재 동일한 작업이 이미 실행 중입니다. 잠시 후 다시 시도해주세요.',
      409,
      'OPERATION_IN_PROGRESS',
      {
        operation: key,
        startedAt: new Date(existingStartedAt).toISOString(),
      },
    );
  }

  activeOperations.set(key, Date.now());

  try {
    return await fn();
  } finally {
    activeOperations.delete(key);
  }
}
