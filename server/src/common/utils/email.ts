import AppError from '../errors/AppError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

export function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new AppError('email은 문자열이어야 합니다.', 400, 'INVALID_EMAIL');
  }

  const normalizedEmail = email.trim();

  if (
    !normalizedEmail ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    throw new AppError('올바른 이메일 형식이 아닙니다.', 400, 'INVALID_EMAIL');
  }

  return normalizedEmail;
}
