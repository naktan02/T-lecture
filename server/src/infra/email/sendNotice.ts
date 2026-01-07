// server/src/infra/email/sendNotice.ts
import { sendEmail, checkEmailLimit, recordEmailSent } from './brevoClient';
import logger from '../../config/logger';

interface NoticeEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * 공지사항/알림 이메일 발송
 */
export const sendNotice = async ({ to, subject, html }: NoticeEmailParams): Promise<void> => {
  // 1. 일일 한도 체크
  await checkEmailLimit();

  // 2. 이메일 발송
  await sendEmail(to, `[T-LECTURE] ${subject}`, html);

  // 3. 발송 성공 시 카운트 증가
  await recordEmailSent();

  const count = Array.isArray(to) ? to.length : 1;
  logger.info(`Notice email sent to ${count} recipients`);
};
