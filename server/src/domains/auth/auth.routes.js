// server/src/domains/auth/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { auth } = require('../../common/middlewares');


// 이메일 인증 관련
router.post('/code/send', authController.sendCode);
router.post('/code/verify', authController.verifyCode);

// 회원가입 및 로그인
router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/refresh', authController.refresh); // Access Token 갱신
router.post('/logout', auth, authController.logout);  


// 비밀번호 재설정
router.post('/reset-password', authController.resetPassword);

module.exports = router;
