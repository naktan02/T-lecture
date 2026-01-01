import { Router } from 'express';
import noticeController from './notice.controller';
import { requireAdmin } from '../../common/middlewares/admin.middleware';
import requireAuth from '../../common/middlewares/auth';

const router = Router();

// Public/User routes
router.get('/', requireAuth, noticeController.getNotices);
router.get('/:id', requireAuth, noticeController.getNotice);

// Admin routes
router.post('/', requireAuth, requireAdmin, noticeController.createNotice);
router.put('/:id', requireAuth, requireAdmin, noticeController.updateNotice);
router.patch('/:id/pin', requireAuth, requireAdmin, noticeController.togglePin);
router.delete('/:id', requireAuth, requireAdmin, noticeController.deleteNotice);

export default router;
