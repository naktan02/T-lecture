import { NextFunction, Request, Response } from 'express';
import dashboardAdminService from '../services/dashboard.admin.service';

class DashboardAdminController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardAdminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };

  getInstructors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, month } = req.query;
      const data = await dashboardAdminService.getInstructorAnalysis(
        year ? Number(year) : undefined,
        month ? Number(month) : undefined,
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  getTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await dashboardAdminService.getTeamAnalysis();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardAdminController();
