import { NextFunction, Request, Response } from 'express';
import dashboardService from '../services/dashboard.user.service';
import AppError from '../../../common/errors/AppError';

type PeriodFilter = '1m' | '3m' | '6m' | '12m';

// Helper: Get date range from period (UTC Midnight)
function getDateRangeFromPeriod(period: PeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  // End: End of current month (Consistent with Admin Dashboard)
  const endDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(currentYear, currentMonth, endDay, 23, 59, 59, 999));

  let start: Date;
  switch (period) {
    case '3m':
      start = new Date(Date.UTC(currentYear, currentMonth - 2, 1, 0, 0, 0, 0));
      break;
    case '6m':
      start = new Date(Date.UTC(currentYear, currentMonth - 5, 1, 0, 0, 0, 0));
      break;
    case '12m':
      start = new Date(Date.UTC(currentYear, currentMonth - 11, 1, 0, 0, 0, 0));
      break;
    case '1m':
    default:
      start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
      break;
  }
  return { start, end };
}

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

      const { startDate, endDate, period } = req.query;
      let startStr: string | undefined;
      let endStr: string | undefined;

      if (startDate && endDate) {
        startStr = startDate as string;
        endStr = endDate as string;
      } else {
        // Use period logic
        const selectedPeriod = (period as PeriodFilter) || '12m'; // Default 12m as requested
        const { start, end } = getDateRangeFromPeriod(selectedPeriod);
        startStr = start.toISOString().split('T')[0];
        endStr = end.toISOString().split('T')[0];
      }

      const stats = await dashboardService.getUserDashboardStats(Number(userId), startStr, endStr);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardController();
