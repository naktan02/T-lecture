// server/src/api/v1/index.ts
import { Router } from 'express';

// 각 도메인별 라우터들
import authRoutes from '../../domains/auth/auth.routes';
import userRoutes from '../../domains/user/routes/user.me.routes';
import adminRoutes from '../../domains/user/routes/user.admin.routes';
import assignmentRoutes from '../../domains/assignment/assignment.routes';
import instructorRoutes from '../../domains/instructor/instructor.routes';
import dispatchRoutes from '../../domains/dispatch/dispatch.routes';
import noticeRoutes from '../../domains/notice/notice.routes';
import inquiryRoutes from '../../domains/inquiry/inquiry.routes';
import distanceRoutes from '../../domains/distance/distance.routes';
import unitRoutes from '../../domains/unit/unit.routes';
import metadataRoutes from '../../domains/metadata/metadata.routes';
import dashboardUserRoutes from '../../domains/dashboard/routes/dashboard.user.routes';
import dashboardAdminRoutes from '../../domains/dashboard/routes/dashboard.admin.routes';
import batchRoutes from '../../domains/batch/batch.routes';
import dataBackupRoutes from '../../domains/data-backup/data-backup.routes';
import reportRoutes from '../../domains/report/report.routes';
import testErrorRoutes from './test-error.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/instructor', instructorRoutes);
router.use('/dispatches', dispatchRoutes);
router.use('/notices', noticeRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/distance', distanceRoutes);
router.use('/units', unitRoutes);
router.use('/metadata', metadataRoutes);
router.use('/dashboard', dashboardUserRoutes);
router.use('/dashboard', dashboardAdminRoutes);
router.use('/batch', batchRoutes);
router.use('/data-backup', dataBackupRoutes);
router.use('/reports', reportRoutes);

// Sentry 테스트용 (개발 환경)
if (process.env.NODE_ENV !== 'production') {
  router.use('/test-error', testErrorRoutes);
}

export default router;
