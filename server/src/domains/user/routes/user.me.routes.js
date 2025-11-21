//server/src/domains/user/routes/user.me.routes.js
const express = require('express');
const router = express.Router();
const userMeController = require('../controllers/user.me.controller');
const { auth } = require('../../../common/middlewares');

// [내 정보 조회] - 로그인 필요
router.get('/me', auth, userMeController.getMyProfile);

// [내 정보 수정] - 로그인 필요
router.patch('/me', auth, userMeController.updateMyProfile);

// [회원 탈퇴] - 로그인 필요
router.delete('/me', auth, userMeController.withdraw);

module.exports = router;
