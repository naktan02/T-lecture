// server/src/infra/email/brevoClient.ts
import * as brevo from '@getbrevo/brevo';
import prisma from '../../libs/prisma';
import { AppError } from '../../common/errors/AppError';
import logger from '../../config/logger';

const apiKey = process.env.BREVO_API_KEY;

// API 키가 없으면 개발 모드에서는 경고만, 프로덕션에서는 에러
if (!apiKey) {
  if (process.env.NODE_ENV === 'production') {
    // 프로덕션에서도 이메일이 필수 기능이 아니라면 에러를 던지지 않고 로깅만 하는 것이 안전할 수 있음
    // 하지만 현재는 확실한 구분을 위해 에러 유지
    logger.error('BREVO_API_KEY is not defined in production environment variables');
  } else {
    logger.warn('BREVO_API_KEY is missing. Email sending will be simulated (mocked).');
  }
}

// API 인스턴스 생성 및 키 설정 (키가 있을 때만)
const apiInstance = new brevo.TransactionalEmailsApi();
if (apiKey) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
}

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
  // 키가 없으면 한도 체크 패스 (모의 발송이므로)
  if (!apiKey) return;

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
  if (apiKey) {
    await incrementEmailCount();
  }
}

/**
 * 현재 남은 이메일 발송 가능 횟수 조회
 */
export async function getRemainingEmailCount(): Promise<number> {
  // 키가 없으면 무한대
  if (!apiKey) return 9999;

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

  // API 키가 없으면 모의 발송 (로그만 출력)
  if (!apiKey) {
    logger.info(`[MOCK EMAIL] To: ${recipients.join(', ')} | Subject: ${subject}`);
    return;
  }

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
