// server/src/domains/report/report.routes.ts
import { Router } from 'express';
import reportController from './report.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = Router();

router.use(auth, requireRole('ADMIN'));

router.get('/years', reportController.getAvailableYears);
router.get('/months', reportController.getAvailableMonths);
router.get('/weeks', reportController.getAvailableWeeks);
router.get('/weekly', reportController.downloadWeekly);
router.get('/monthly', reportController.downloadMonthly);

export default router;
