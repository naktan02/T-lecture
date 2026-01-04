import { Router } from 'express';
import dashboardAdminController from '../controllers/dashboard.admin.controller';
import { auth, requireRole } from '../../../common/middlewares';

const router = Router();

// Base Logic: Requires valid Token (auth)
router.use(auth);

// Admin Only
// If 'ADMIN' role string is used, or check `requireRole` implementation.
// Assuming 'ADMIN' covers General/Super. If stricter check needed, use specific roles.
router.get('/admin/stats', requireRole('ADMIN'), dashboardAdminController.getStats);
router.get('/admin/instructors', requireRole('ADMIN'), dashboardAdminController.getInstructors);
router.get('/admin/teams', requireRole('ADMIN'), dashboardAdminController.getTeams);

export default router;
