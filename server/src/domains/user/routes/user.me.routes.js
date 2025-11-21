// domains/user/routes/user.me.routes.js
const express = require('express');
const router = express.Router();

const auth = require('../../../common/middlewares/auth');
const controller = require('../controllers/user.me.controller');

// ✅ 내 프로필 조회
// GET /api/v1/users/me
router.get('/me', auth, controller.getMyProfile);

// ✅ 내 프로필 수정 (이름, 연락처 등)
// PATCH /api/v1/users/me
router.patch('/me', auth, controller.updateMyProfile);

// 필요하면 나중에 비밀번호 변경 같은 것도 여기 추가 가능
// router.patch('/me/password', auth, controller.changeMyPassword);

module.exports = router;
