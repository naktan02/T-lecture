// server/src/domains/auth/auth.routes.ts
import { Router } from 'express';
import * as authController from './auth.controller';
import { auth } from '../../common/middlewares';

const router = Router();

// 이메일 인증 코드 발송
router.post('/code/send', authController.sendCode);

// 이메일 인증 코드 검증
router.post('/code/verify', authController.verifyCode);

// 회원가입
router.post('/register', authController.register);

// 로그인
router.post('/login', authController.login);

// 토큰 재발급
router.post('/refresh', authController.refresh); 

// 로그아웃
router.post('/logout', auth, authController.logout);  

// 비밀번호 재설정
router.post('/reset-password', authController.resetPassword);

export default router;