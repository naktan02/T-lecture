// server/src/domains/dashboard/dashboard.controller.ts
import { NextFunction, Request, Response } from 'express';
import dashboardService from './dashboard.service';
import AppError from '../../common/errors/AppError';

class DashboardController {
  /**
   * 유저 대시보드 통계 조회
   * GET /api/v1/dashboard/user/stats
   */
  getUserDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('인증 정보가 없습니다.', 401, 'AUTH_ERROR');
      }

      const { startDate, endDate } = req.query;
      const stats = await dashboardService.getUserDashboardStats(
        Number(userId),
        startDate as string | undefined,
        endDate as string | undefined,
      );
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardController();
