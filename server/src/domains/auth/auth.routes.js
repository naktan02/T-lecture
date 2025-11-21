const express = require('express');
const router = express.Router();
const authController = require('../../domains/auth/controllers/auth.controller');

// 회원가입 (POST /api/v1/auth/register)
router.post('/register', authController.register);

// 로그인 (POST /api/v1/auth/login)
router.post('/login', authController.login);

// [신규] 비밀번호 찾기 및 재설정
router.post('/forgot-password', authController.forgotPassword); // 이메일 발송 요청
router.post('/reset-password', authController.resetPassword);   // 새 비밀번호 설정

module.exports = router;