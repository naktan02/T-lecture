// server/src/domains/report/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import reportService from './report.service';

export class ReportController {
  /**
   * GET /api/v1/reports/years
   * 사용 가능한 연도 목록 조회
   */
  async getAvailableYears(req: Request, res: Response, next: NextFunction) {
    try {
      const years = await reportService.getAvailableYears();
      res.json(years);
    } catch (error) {
      next(error);
    }
  }

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
      const filename = `${year.toString().slice(-2)}년 ${month}월 ${week}주차 주간 보고서.xlsx`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
      const filename = `${year.toString().slice(-2)}년 ${month}월 월간 보고서.xlsx`;
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportController();
