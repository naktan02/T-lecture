// server/src/infra/email/sendAuthCode.ts
import { sendEmail, checkEmailLimit, recordEmailSent } from './brevoClient';
import logger from '../../config/logger';

/**
 * 이메일 인증 코드 발송
 */
export const sendAuthCode = async (toEmail: string, code: string): Promise<void> => {
  // 1. 일일 한도 체크 (초과 시 에러 throw)
  await checkEmailLimit();

  // 2. 이메일 발송
  await sendEmail(
    toEmail,
    '[T-LECTURE] 이메일 인증번호 안내',
    `
      <div style="padding: 20px; border: 1px solid #ddd; max-width: 400px; font-family: sans-serif;">
        <h3 style="color: #333;">이메일 인증</h3>
        <p>안녕하세요, T-LECTURE 입니다.</p>
        <p>아래의 인증번호 6자리를 입력하여 인증을 완료해주세요.</p>
        <h2 style="color: #007bff; letter-spacing: 2px; text-align: center; padding: 10px; background: #f5f5f5; border-radius: 8px;">${code}</h2>
        <p style="font-size: 12px; color: gray;">* 이 코드는 3분간 유효합니다.</p>
      </div>
    `,
  );

  // 3. 발송 성공 시 카운트 증가
  await recordEmailSent();
  logger.info(`Verification email sent to ${toEmail}`);
};
