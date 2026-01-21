// server/src/domains/report/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import reportService from './report.service';

export class ReportController {
  /**
   * GET /api/v1/reports/weekly?year=2025&month=6&week=2
   */
  async downloadWeekly(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      const week = parseInt(req.query.week as string, 10);

      if (isNaN(year) || isNaN(month) || isNaN(week)) {
        res.status(400).json({ message: 'Year, Month, and Week are required.' });
        return;
      }

      const buffer = await reportService.generateWeeklyReport({ year, month, week });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Weekly_Report_${year}_${month}_${week}w.xlsx`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/monthly?year=2025&month=6
   */
  async downloadMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);

      if (isNaN(year) || isNaN(month)) {
        res.status(400).json({ message: 'Year and Month are required.' });
        return;
      }

      const buffer = await reportService.generateMonthlyReport({ year, month });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Monthly_Report_${year}_${month}.xlsx`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportController();
