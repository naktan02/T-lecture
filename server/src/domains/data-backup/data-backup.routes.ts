// server/src/domains/data-backup/data-backup.routes.ts
import { Router } from 'express';
import dataBackupController from './data-backup.controller';
import { auth, adminMiddleware } from '../../common/middlewares';

const router = Router();

// 모든 라우트에 관리자 권한 필요
router.use(auth, adminMiddleware.requireAdmin);

// 엑셀 다운로드
router.get('/export', (req, res, next) => dataBackupController.exportData(req, res, next));

// 삭제 미리보기
router.get('/preview', (req, res, next) => dataBackupController.getDeletePreview(req, res, next));

// 데이터 삭제
router.delete('/cleanup', (req, res, next) => dataBackupController.deleteData(req, res, next));

export default router;
