// server/src/domains/data-backup/data-backup.controller.ts
import { Request, Response, NextFunction } from 'express';
import dataBackupService from './data-backup.service';
import { AppError } from '../../common/errors/AppError';

export class DataBackupController {
  /**
   * GET /api/v1/data-backup/export?year=2025
   * 엑셀 파일 다운로드
   */
  async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);

      if (!year || year < 2020 || year > new Date().getFullYear()) {
        throw new AppError('유효하지 않은 연도입니다.', 400, 'INVALID_YEAR');
      }

      const workbook = await dataBackupService.generateExcel({ year });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=T-Lecture_${year}_Archive.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/data-backup/db-size
   * 데이터베이스 용량 조회
   */
  async getDatabaseSize(req: Request, res: Response, next: NextFunction) {
    try {
      const size = await dataBackupService.getDatabaseSize();
      res.json(size);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/data-backup/preview?year=2025
   * 삭제 미리보기 (삭제될 데이터 개수)
   */
  async getDeletePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);

      if (!year || year < 2020 || year >= new Date().getFullYear()) {
        throw new AppError(
          '유효하지 않은 연도입니다. 현재 연도는 삭제할 수 없습니다.',
          400,
          'INVALID_YEAR',
        );
      }

      const preview = await dataBackupService.getDeletePreview(year);
      res.json(preview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/data-backup/cleanup?year=2025
   * 해당 연도 데이터 삭제
   */
  async deleteData(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);

      if (!year || year < 2020 || year >= new Date().getFullYear()) {
        throw new AppError(
          '유효하지 않은 연도입니다. 현재 연도는 삭제할 수 없습니다.',
          400,
          'INVALID_YEAR',
        );
      }

      const result = await dataBackupService.deleteDataByYear(year);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export default new DataBackupController();
