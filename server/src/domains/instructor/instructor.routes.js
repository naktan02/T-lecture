// web/server/src/api/v1/instructor.routes.js
const express = require('express');
const router = express.Router();

const instructorController = require('./instructor.controller');
const { auth, requireRole } = require('../../common/middlewares');

// [수정] 미들웨어를 각 API 엔드포인트에 개별 적용

// 1. 근무 가능일 조회
// GET /api/v1/instructor/availability
router.get('/availability', auth, requireRole('INSTRUCTOR'), instructorController.getAvailability);

// 2. 근무 가능일 수정
// PUT /api/v1/instructor/availability
router.put('/availability', auth, requireRole('INSTRUCTOR'), instructorController.updateAvailability);


// 강사 강의 가능 과목 조회
// 강사 강의 가능 과목 수정

// 일반 유저가 강사로 변경 시 필요 정보 입력 및 등록

// 3. [신규] 내 통계 조회
router.get('/stats', auth, requireRole('INSTRUCTOR'), instructorController.getMyStats);

// 4. [신규] 강의 가능 과목 수정
router.put('/virtues', auth, requireRole('INSTRUCTOR'), instructorController.updateVirtues);

// 5. [변경] 승급 신청 (POST)
// -> 증명서 발급(certificate) 대신 승급 신청(promotion)으로 변경
router.post('/promotion', auth, requireRole('INSTRUCTOR'), instructorController.requestPromotion);

module.exports = router;