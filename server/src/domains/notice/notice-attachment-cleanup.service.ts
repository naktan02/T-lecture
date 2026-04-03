import cron, { ScheduledTask } from 'node-cron';
import logger from '../../config/logger';
import noticeService from './notice.service';

let cleanupTask: ScheduledTask | null = null;

export const startNoticeAttachmentCleanup = () => {
  if (cleanupTask) {
    return;
  }

  cleanupTask = cron.schedule(
    '15 3 * * *',
    async () => {
      try {
        const deletedCount = await noticeService.cleanupExpiredAttachments();
        if (deletedCount > 0) {
          logger.info(`[NoticeAttachmentCleanup] deleted ${deletedCount} expired attachments`);
        }
      } catch (error) {
        logger.error('[NoticeAttachmentCleanup] failed to delete expired attachments', error);
      }
    },
    {
      timezone: 'Asia/Seoul',
    },
  );
};

export const stopNoticeAttachmentCleanup = () => {
  if (!cleanupTask) {
    return;
  }

  cleanupTask.stop();
  cleanupTask.destroy();
  cleanupTask = null;
};
