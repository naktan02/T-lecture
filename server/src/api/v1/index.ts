// server/src/api/v1/index.ts
import { Router } from 'express';

// 각 도메인별 라우터들
import authRoutes from '../../domains/auth/auth.routes';
import userRoutes from '../../domains/user/routes/user.me.routes';
import adminRoutes from '../../domains/user/routes/user.admin.routes';
import assignmentRoutes from '../../domains/assignment/assignment.routes';
import instructorRoutes from '../../domains/instructor/instructor.routes';
import messageRoutes from '../../domains/message/message.routes';
import distanceRoutes from '../../domains/distance/distance.routes';
import unitRoutes from '../../domains/unit/unit.routes';
import metadataRoutes from '../../domains/metadata/metadata.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/instructor', instructorRoutes);
router.use('/messages', messageRoutes);
router.use('/distance', distanceRoutes);
router.use('/units', unitRoutes);
router.use('/metadata', metadataRoutes);

export default router;
