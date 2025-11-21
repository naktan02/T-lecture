const express = require('express');
const router = express.Router();
const instructorController = require('../../domains/instructor/controllers/instructor.controller');
const { checkAuth, checkInstructor } = require('../../common/middlewares/auth');

// [중요] 이 라우터 아래의 모든 요청은 '로그인' + '강사권한'이 필요함
router.use(checkAuth);
router.use(checkInstructor);

// GET /api/v1/instructor/me
router.get('/me', instructorController.getMe);

// PATCH /api/v1/instructor/me (추후 구현)
router.patch('/me', instructorController.updateMe);

// [신규] 근무 가능일 관리
router.get('/availability', instructorController.getAvailability);
router.put('/availability', instructorController.updateAvailability);

module.exports = router;