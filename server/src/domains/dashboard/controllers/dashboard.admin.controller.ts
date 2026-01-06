import { NextFunction, Request, Response } from 'express';
import dashboardAdminService from '../services/dashboard.admin.service';
import dashboardUserService from '../services/dashboard.user.service';

type PeriodFilter = '1m' | '3m' | '6m' | '12m';
type ScheduleStatus = 'completed' | 'inProgress' | 'scheduled' | 'unassigned';

// Helper: Date를 UTC 자정으로 변환
function toUTCMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

// Helper function to get date range from period (UTC 자정 기준)
function getDateRangeFromPeriod(period: PeriodFilter): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  // End: 현재 월 말일 23:59:59 UTC (which covers the whole month until now)
  // But wait, user dashboard uses "Until Today".
  // Let's align with Admin Dashboard original logic: end of current month?
  // Original logic was: end = new Date(Date.UTC(currentYear, currentMonth + 1, 0)) which is last day of month.
  // Actually, for "Recent X Months", it usually means "X months ago 1st day" ~ "Now".
  // Let's stick to the original logic logic found in service:
  // start = 1st day of month - X months.
  // end = Today (or end of month? Original code had end of month)
  // Let's use Today for end, to be consistent with real-time data or end of current month.
  // existing service code used:
  // const endDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
  // const end = new Date(Date.UTC(currentYear, currentMonth, endDay, 23, 59, 59, 999));
  // This means "End of this month". Let's keep it to ensure backward compatibility for '1m' etc.

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

class DashboardAdminController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardAdminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };

  getSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as ScheduleStatus;
      if (!status || !['completed', 'inProgress', 'scheduled', 'unassigned'].includes(status)) {
        res.status(400).json({ message: 'Invalid status parameter' });
        return;
      }
      const data = await dashboardAdminService.getSchedulesByStatus(status);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  private getDatesFromQuery(query: any): { start: Date; end: Date } {
    const { startDate, endDate, period } = query;

    if (startDate && endDate) {
      return {
        start: new Date(`${startDate}T00:00:00.000Z`),
        end: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    // Default to period logic
    const selectedPeriod = (period as PeriodFilter) || '1m';
    return getDateRangeFromPeriod(selectedPeriod);
  }

  getInstructors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = this.getDatesFromQuery(req.query);
      const data = await dashboardAdminService.getInstructorAnalysis(start, end);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = this.getDatesFromQuery(req.query);
      const data = await dashboardAdminService.getTeamAnalysis(start, end);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getTeamDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      if (isNaN(teamId)) {
        res.status(400).json({ message: 'Invalid team ID' });
        return;
      }

      const { start, end } = this.getDatesFromQuery(req.query);
      const data = await dashboardAdminService.getTeamDetail(teamId, start, end);

      if (!data) {
        res.status(404).json({ message: 'Team not found' });
        return;
      }
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getInstructorDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructorId = parseInt(req.params.instructorId, 10);

      if (isNaN(instructorId)) {
        res.status(400).json({ message: 'Invalid instructor ID' });
        return;
      }

      // 기간 필터 적용
      // getDatesFromQuery returns Date objects (UTC midnight or end of day)
      // getUserDashboardStats expects YYYY-MM-DD strings
      const { start, end } = this.getDatesFromQuery(req.query);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const data = await dashboardUserService.getUserDashboardStats(
        instructorId,
        startDate,
        endDate,
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  // 상태별 부대 목록 (부대 단위 그룹화)
  getUnits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as ScheduleStatus;
      if (!status || !['completed', 'inProgress', 'scheduled', 'unassigned'].includes(status)) {
        res.status(400).json({ message: 'Invalid status parameter' });
        return;
      }
      const data = await dashboardAdminService.getUnitsByStatus(status);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  // 부대 상세 정보
  getUnitDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const unitId = parseInt(req.params.unitId, 10);
      if (isNaN(unitId)) {
        res.status(400).json({ message: 'Invalid unit ID' });
        return;
      }

      const data = await dashboardAdminService.getUnitDetail(unitId);

      if (!data) {
        res.status(404).json({ message: 'Unit not found' });
        return;
      }
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardAdminController();
