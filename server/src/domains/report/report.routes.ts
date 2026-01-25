// server/src/domains/report/report.routes.ts
import { Router } from 'express';
import reportController from './report.controller';

const router = Router();

router.get('/years', reportController.getAvailableYears);
router.get('/weekly', reportController.downloadWeekly);
router.get('/monthly', reportController.downloadMonthly);

export default router;
