import { NextFunction, Request, Response } from 'express';
import dashboardAdminService from '../services/dashboard.admin.service';

type PeriodFilter = '1m' | '3m' | '6m' | '12m';
type ScheduleStatus = 'completed' | 'inProgress' | 'scheduled' | 'unassigned';

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

  getInstructors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as PeriodFilter) || '1m';
      const data = await dashboardAdminService.getInstructorAnalysis(period);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as PeriodFilter) || '1m';
      const data = await dashboardAdminService.getTeamAnalysis(period);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getTeamDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const period = (req.query.period as PeriodFilter) || '1m';

      if (isNaN(teamId)) {
        res.status(400).json({ message: 'Invalid team ID' });
        return;
      }

      const data = await dashboardAdminService.getTeamDetail(teamId, period);
      if (!data) {
        res.status(404).json({ message: 'Team not found' });
        return;
      }
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardAdminController();
