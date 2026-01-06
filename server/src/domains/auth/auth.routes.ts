// server/src/domains/auth/auth.routes.ts
import { Router } from 'express';
import * as authController from './auth.controller';
import { auth, rateLimiter } from '../../common/middlewares';

const router = Router();

// 이메일 인증 코드 발송 (Rate Limit: 15분당 10회)
router.post('/code/send', rateLimiter.authLimiter, authController.sendCode);

// 이메일 인증 코드 검증 (Rate Limit: 15분당 10회)
router.post('/code/verify', rateLimiter.authLimiter, authController.verifyCode);

// 회원가입
router.post('/register', authController.register);

// 로그인 (Rate Limit: 15분당 10회 - 브루트포스 방지)
router.post('/login', rateLimiter.authLimiter, authController.login);

// 토큰 재발급
router.post('/refresh', authController.refresh);

// 로그아웃
router.post('/logout', auth, authController.logout);

// 비밀번호 재설정 (Rate Limit: 15분당 10회)
router.post('/reset-password', rateLimiter.authLimiter, authController.resetPassword);

export default router;
