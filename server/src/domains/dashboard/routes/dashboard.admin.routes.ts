import { Router } from 'express';
import dashboardAdminController from '../controllers/dashboard.admin.controller';
import { auth, requireRole } from '../../../common/middlewares';

const router = Router();

router.use(auth);

// Admin Dashboard endpoints
router.get('/admin/stats', requireRole('ADMIN'), dashboardAdminController.getStats);
router.get('/admin/schedules', requireRole('ADMIN'), dashboardAdminController.getSchedules);
router.get('/admin/instructors', requireRole('ADMIN'), dashboardAdminController.getInstructors);
router.get(
  '/admin/instructors/:instructorId/dashboard',
  requireRole('ADMIN'),
  dashboardAdminController.getInstructorDashboard,
);
router.get('/admin/teams', requireRole('ADMIN'), dashboardAdminController.getTeams);
router.get('/admin/teams/:teamId', requireRole('ADMIN'), dashboardAdminController.getTeamDetail);

// Unit-based endpoints (부대 단위 조회)
router.get('/admin/units', requireRole('ADMIN'), dashboardAdminController.getUnits);
router.get('/admin/units/:unitId', requireRole('ADMIN'), dashboardAdminController.getUnitDetail);

export default router;
