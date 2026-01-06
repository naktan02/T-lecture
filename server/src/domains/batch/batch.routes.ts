// server/src/domains/batch/batch.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import distanceService from '../distance/distance.service';
import AppError from '../../common/errors/AppError';
import { rateLimiter } from '../../common/middlewares';

const router = Router();

// 배치 API 시크릿 토큰 검증 미들웨어
const verifyBatchToken = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const batchSecret = process.env.BATCH_API_SECRET;

  if (!batchSecret) {
    throw new AppError('BATCH_API_SECRET 환경변수가 설정되지 않았습니다.', 500, 'CONFIG_ERROR');
  }

  if (!authHeader || authHeader !== `Bearer ${batchSecret}`) {
    throw new AppError('배치 API 인증에 실패했습니다.', 401, 'BATCH_AUTH_FAILED');
  }

  next();
};

/**
 * POST /api/v1/batch/distance
 * 거리 배치 계산 실행 (GitHub Actions에서 호출)
 * Rate Limit: 1분당 5회
 */
router.post(
  '/distance',
  rateLimiter.batchLimiter,
  verifyBatchToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Number(req.query.limit) || 200;
      const result = await distanceService.calculateDistancesBySchedulePriority(limit);

      res.json({
        success: true,
        ...result,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/batch/distance/status
 * 재계산 필요 개수 조회 (모니터링용)
 * Rate Limit: 1분당 5회
 */
router.get(
  '/distance/status',
  rateLimiter.batchLimiter,
  verifyBatchToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const needsRecalcCount = await distanceService.getNeedsRecalcCount();
      const usage = await distanceService.getTodayUsage();

      res.json({
        needsRecalcCount,
        apiUsage: usage,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/batch/ping
 * 서버 상태 확인 (Render 깨우기용)
 * Rate Limit: 1분당 30회 (관대하게)
 */
router.get('/ping', rateLimiter.pingLimiter, (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
