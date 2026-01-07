// server/src/infra/email/brevoClient.ts
import * as brevo from '@getbrevo/brevo';
import prisma from '../../libs/prisma';
import { AppError } from '../../common/errors/AppError';
import logger from '../../config/logger';

if (!process.env.BREVO_API_KEY) {
  throw new Error('BREVO_API_KEY is not defined in environment variables');
}

// API 인스턴스 생성 및 키 설정
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// 발신자 이메일 (Brevo 계정에 등록된 이메일)
export const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@t-lecture.com';
export const FROM_NAME = process.env.BREVO_FROM_NAME || 'T-LECTURE';

// 일일 이메일 발송 한도 (Brevo 무료 플랜)
const DAILY_EMAIL_LIMIT = 300;

/**
 * 오늘 날짜에 해당하는 이메일 카운트 키 생성
 */
function getTodayKey(): string {
  const today = new Date().toISOString().split('T')[0]; // "2026-01-07"
  return `EMAIL_COUNT_${today}`;
}

/**
 * 오늘 발송 횟수 조회
 */
async function getTodayEmailCount(): Promise<number> {
  const key = getTodayKey();
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });
  return config ? parseInt(config.value, 10) : 0;
}

/**
 * 발송 횟수 증가
 */
async function incrementEmailCount(): Promise<void> {
  const key = getTodayKey();
  const currentCount = await getTodayEmailCount();

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(currentCount + 1) },
    create: { key, value: '1', description: '일일 이메일 발송 횟수' },
  });
}

/**
 * 이메일 발송 전 한도 체크
 * @throws AppError 한도 초과 시
 */
export async function checkEmailLimit(): Promise<void> {
  const count = await getTodayEmailCount();

  if (count >= DAILY_EMAIL_LIMIT) {
    logger.warn(`Daily email limit reached: ${count}/${DAILY_EMAIL_LIMIT}`);
    throw new AppError(
      '오늘 이메일 발송 한도(300건)에 도달했습니다. 내일 다시 시도해주세요.',
      429,
      'EMAIL_LIMIT_EXCEEDED',
    );
  }

  logger.debug(`Email count: ${count + 1}/${DAILY_EMAIL_LIMIT}`);
}

/**
 * 이메일 발송 성공 후 카운트 증가
 */
export async function recordEmailSent(): Promise<void> {
  await incrementEmailCount();
}

/**
 * 현재 남은 이메일 발송 가능 횟수 조회
 */
export async function getRemainingEmailCount(): Promise<number> {
  const count = await getTodayEmailCount();
  return Math.max(0, DAILY_EMAIL_LIMIT - count);
}

/**
 * Brevo API를 통해 이메일 발송
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME };
  sendSmtpEmail.to = recipients.map((email) => ({ email }));
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info(`Email sent to ${recipients.length} recipients via Brevo`);
  } catch (err) {
    logger.error(`Brevo email error: ${err instanceof Error ? err.message : err}`);
    throw new AppError('이메일 발송에 실패했습니다.', 500, 'EMAIL_SEND_FAILED');
  }
}
