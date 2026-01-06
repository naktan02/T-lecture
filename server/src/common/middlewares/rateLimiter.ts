// server/src/common/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';

/**
 * 일반 API용 Rate Limiter
 * - 15분당 IP당 100회
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 100회
  message: {
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: true, // RateLimit-* 헤더 포함
  legacyHeaders: false, // X-RateLimit-* 헤더 제외
});

/**
 * 인증 API용 Rate Limiter (로그인, 인증코드 발송 등)
 * - 15분당 IP당 10회 (브루트포스 방지)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // IP당 10회
  message: {
    success: false,
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: '인증 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 배치 API용 Rate Limiter
 * - 1분당 IP당 5회 (과도한 서버 부하 방지)
 */
export const batchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // IP당 5회
  message: {
    success: false,
    error: 'Batch API rate limit exceeded',
    code: 'BATCH_RATE_LIMIT_EXCEEDED',
    message: '배치 API 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Ping API용 Rate Limiter
 * - 1분당 IP당 30회 (서버 깨우기용, 관대하게)
 */
export const pingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // IP당 30회
  message: {
    success: false,
    error: 'Ping rate limit exceeded',
    code: 'PING_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
