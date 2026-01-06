// server/src/domains/dashboard/routes/dashboard.user.routes.ts
import { Router } from 'express';
import dashboardController from '../controllers/dashboard.user.controller';
import { auth, requireRole } from '../../../common/middlewares';

const router = Router();

// 유저 대시보드 통계
// 인증된 강사만 접근 가능
router.get(
  '/user/stats',
  auth,
  requireRole('INSTRUCTOR'),
  dashboardController.getUserDashboardStats,
);

// 유저 활동 내역 조회 (페이징)
router.get(
  '/user/activities',
  auth,
  requireRole('INSTRUCTOR'),
  dashboardController.getUserActivities,
);

export default router;
