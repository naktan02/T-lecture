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
   * GET /api/v1/reports/months?year=2026
   * 해당 연도의 데이터가 있는 월 목록 조회
   */
  async getAvailableMonths(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);

      if (isNaN(year)) {
        res.status(400).json({ message: 'Year is required.' });
        return;
      }

      const months = await reportService.getAvailableMonths(year);
      res.json(months);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/weeks?year=2025&month=1
   * 해당 월의 데이터가 있는 주차 목록 조회
   */
  async getAvailableWeeks(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);

      if (isNaN(year) || isNaN(month)) {
        res.status(400).json({ message: 'Year and Month are required.' });
        return;
      }

      const weeks = await reportService.getAvailableWeeks(year, month);
      res.json(weeks);
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
      // 데이터 없음 에러는 404로 응답
      if (error instanceof Error && error.message.includes('교육 데이터가 없습니다')) {
        res.status(404).json({ message: error.message });
        return;
      }
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
      // 데이터 없음 에러는 404로 응답
      if (error instanceof Error && error.message.includes('교육 데이터가 없습니다')) {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
}

export default new ReportController();
