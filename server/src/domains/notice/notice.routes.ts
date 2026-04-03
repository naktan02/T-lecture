import express from 'express';
import multer from 'multer';
import { auth, requireRole } from '../../common/middlewares';
import {
  NOTICE_ATTACHMENT_MAX_FILES,
  NOTICE_ATTACHMENT_MAX_TOTAL_BYTES,
} from './notice-attachment.constants';
import * as noticeController from './notice.controller';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: NOTICE_ATTACHMENT_MAX_FILES,
    fileSize: NOTICE_ATTACHMENT_MAX_TOTAL_BYTES,
  },
});

router.get('/', auth, noticeController.getNotices);
router.get(
  '/attachments/:attachmentId/download-ticket',
  auth,
  noticeController.getNoticeAttachmentDownloadTicket,
);
router.get(
  '/attachments/:attachmentId/direct-download',
  noticeController.directDownloadNoticeAttachment,
);
router.get('/attachments/:attachmentId/download', auth, noticeController.downloadNoticeAttachment);
router.get('/:id', auth, noticeController.getNotice);

router.post(
  '/',
  auth,
  requireRole('ADMIN'),
  upload.array('files', NOTICE_ATTACHMENT_MAX_FILES),
  noticeController.createNotice,
);
router.put(
  '/:id',
  auth,
  requireRole('ADMIN'),
  upload.array('files', NOTICE_ATTACHMENT_MAX_FILES),
  noticeController.updateNotice,
);
router.delete('/:id', auth, requireRole('ADMIN'), noticeController.deleteNotice);
router.patch('/:id/pin', auth, requireRole('ADMIN'), noticeController.toggleNoticePin);

export default router;
