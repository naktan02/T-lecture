// server/src/infra/email.service.ts
import nodemailer from 'nodemailer';
import logger from '../config/logger';
import { AppError } from '../common/errors/AppError';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationCode = async (toEmail: string, code: string): Promise<void> => {
  const mailOptions = {
    from: `"T-LECTURE Auth" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '[T-LECTURE] 이메일 인증번호 안내',
    html: `
      <div style="padding: 20px; border: 1px solid #ddd; max-width: 400px;">
        <h3>이메일 인증</h3>
        <p>안녕하세요, T-LECTURE 입니다.</p>
        <p>아래의 인증번호 6자리를 입력하여 인증을 완료해주세요.</p>
        <h2 style="color: #007bff; letter-spacing: 2px;">${code}</h2>
        <p style="font-size: 12px; color: gray;">* 이 코드는 3분간 유효합니다.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${toEmail}`);
  } catch (err) {
    logger.error(
      `Failed to send verification email to ${toEmail}: ${err instanceof Error ? err.message : err}`,
    );
    throw new AppError('이메일 발송에 실패했습니다.', 500, 'EMAIL_SEND_FAILED');
  }
};

export default { sendVerificationCode };
