// server/src/api/v1/test-error.routes.ts
// Sentry 테스트용 에러 발생 API (개발 환경 전용)

import { Router, Request, Response, NextFunction } from 'express';
import { captureError } from '../../config/sentry';
import { AppError } from '../../common/errors/AppError';

const router = Router();

/**
 * GET /api/v1/test-error/simple
 * 기본 Error 발생
 */
router.get('/simple', (_req: Request, _res: Response) => {
  throw new Error('Sentry 테스트: 기본 에러입니다.');
});

/**
 * GET /api/v1/test-error/type-error
 * TypeError 발생 (null 참조)
 */
router.get('/type-error', (_req: Request, _res: Response) => {
  const obj: { name?: string } | null = null;
  // @ts-expect-error 의도적 에러
  console.log(obj.name.toUpperCase());
});

/**
 * GET /api/v1/test-error/reference-error
 * ReferenceError 발생 (정의되지 않은 변수)
 */
router.get('/reference-error', (_req: Request, _res: Response) => {
  // @ts-expect-error 의도적 에러
  console.log(undefinedVariable);
});

/**
 * GET /api/v1/test-error/async-error
 * 비동기 에러 발생
 */
router.get('/async-error', async (_req: Request, _res: Response) => {
  await new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Sentry 테스트: 비동기 에러입니다.')), 100);
  });
});

/**
 * GET /api/v1/test-error/app-error
 * 커스텀 AppError 발생
 */
router.get('/app-error', (_req: Request, _res: Response) => {
  throw new AppError('Sentry 테스트: 비즈니스 로직 에러입니다.', 400, 'TEST_APP_ERROR');
});

/**
 * GET /api/v1/test-error/unhandled-rejection
 * Unhandled Promise Rejection
 */
router.get('/unhandled-rejection', (_req: Request, res: Response) => {
  // 의도적으로 catch하지 않음
  Promise.reject(new Error('Sentry 테스트: Unhandled Promise Rejection'));
  res.json({ message: '에러가 비동기로 발생합니다.' });
});

/**
 * GET /api/v1/test-error/manual-capture
 * 수동 캡처 테스트 (에러 응답 없이 캡처만)
 */
router.get('/manual-capture', (_req: Request, res: Response) => {
  const testError = new Error('Sentry 테스트: 수동 캡처된 에러');
  captureError(testError, {
    userId: 'test-user-123',
    action: 'manual-capture-test',
    timestamp: new Date().toISOString(),
  });
  res.json({
    message: '에러가 Sentry로 전송되었습니다 (응답은 정상).',
    note: 'Sentry 대시보드에서 확인하세요.',
  });
});

/**
 * GET /api/v1/test-error/db-error
 * 데이터베이스 에러 시뮬레이션
 */
router.get('/db-error', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    // 존재하지 않는 테이블 쿼리 시뮬레이션
    throw new Error('Sentry 테스트: 데이터베이스 연결 실패 (시뮬레이션)');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/test-error/list
 * 사용 가능한 테스트 endpoint 목록
 */
router.get('/list', (_req: Request, res: Response) => {
  res.json({
    message: 'Sentry 테스트용 에러 API 목록',
    endpoints: [
      { path: '/api/v1/test-error/simple', description: '기본 Error' },
      { path: '/api/v1/test-error/type-error', description: 'TypeError (null 참조)' },
      {
        path: '/api/v1/test-error/reference-error',
        description: 'ReferenceError (정의되지 않은 변수)',
      },
      { path: '/api/v1/test-error/async-error', description: '비동기 에러' },
      { path: '/api/v1/test-error/app-error', description: '커스텀 AppError (400)' },
      {
        path: '/api/v1/test-error/unhandled-rejection',
        description: 'Unhandled Promise Rejection',
      },
      { path: '/api/v1/test-error/manual-capture', description: '수동 캡처 (응답 정상)' },
      { path: '/api/v1/test-error/db-error', description: 'DB 에러 시뮬레이션' },
    ],
    checkAt: 'https://sentry.io → 프로젝트 → Issues',
  });
});

export default router;
