// server/src/common/errors/prismaErrorMapper.ts
import { Prisma } from '../../generated/prisma/client.js';
import AppError from './AppError';

export function mapPrismaError(err: unknown): AppError | null {
  // 1. Known Request Error (P2002, P2025 등)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const baseInfo = { prismaCode: err.code, meta: err.meta, message: err.message };

    switch (err.code) {
      case 'P2002': {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[]).join(', ')
          : String(err.meta?.target || 'field');
        return new AppError(
          `중복 오류: ${target} 값이 이미 존재합니다.`,
          409,
          'DUPLICATE_RESOURCE',
          baseInfo,
        );
      }

      case 'P2025': {
        const cause = err.meta?.cause || err.message;
        return new AppError(`조회 실패: ${cause}`, 404, 'NOT_FOUND', baseInfo);
      }

      case 'P2003': {
        const field = err.meta?.field_name || 'unknown';
        return new AppError(
          `참조 오류: ${field} 외래키 제약 위반`,
          409,
          'FOREIGN_KEY_CONFLICT',
          baseInfo,
        );
      }

      case 'P2010':
      case 'P2011':
        return new AppError(`쿼리 오류: ${err.message}`, 500, 'QUERY_ERROR', baseInfo);

      case 'P2024':
        return new AppError(
          'DB 연결 풀 타임아웃: 연결을 가져오는데 실패했습니다.',
          503,
          'POOL_TIMEOUT',
          baseInfo,
        );

      default:
        return new AppError(`DB 오류 [${err.code}]: ${err.message}`, 500, 'DB_ERROR', baseInfo);
    }
  }

  // 2. Validation Error (스키마 불일치, 잘못된 필드 등)
  if (err instanceof Prisma.PrismaClientValidationError) {
    const detailMessage = err.message.split('\n').slice(-3).join(' ').trim();
    return new AppError(`Prisma 검증 오류: ${detailMessage}`, 400, 'PRISMA_VALIDATION_ERROR', {
      fullMessage: err.message,
    });
  }

  // 3. Initialization Error (DB 연결 실패)
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      `DB 연결 실패 [${err.errorCode || 'UNKNOWN'}]: ${err.message}`,
      503,
      'DB_CONNECTION_ERROR',
      { errorCode: err.errorCode, message: err.message },
    );
  }

  // 4. Rust Panic Error
  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return new AppError(`Prisma 내부 오류: ${err.message}`, 500, 'PRISMA_PANIC', {
      message: err.message,
    });
  }

  // 5. Unknown Request Error
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return new AppError(`알 수 없는 DB 오류: ${err.message}`, 500, 'DB_UNKNOWN_ERROR', {
      message: err.message,
    });
  }

  return null;
}
