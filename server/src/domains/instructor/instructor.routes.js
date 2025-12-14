// web/server/src/api/v1/instructor.routes.js
const express = require('express');
const router = express.Router();

const instructorController = require('./instructor.controller');
const { auth, requireRole } = require('../../common/middlewares');


// 근무 가능일 조회
router.get('/availability', auth, requireRole('INSTRUCTOR'), instructorController.getAvailability);

// 근무 가능일 수정
router.put('/availability', auth, requireRole('INSTRUCTOR'), instructorController.updateAvailability);

// 내 통계 조회
router.get('/stats', auth, requireRole('INSTRUCTOR'), instructorController.getMyStats);

// 강의 가능 과목 수정
router.put('/virtues', auth, requireRole('INSTRUCTOR'), instructorController.updateVirtues);

// 승급 신청
router.post('/promotion', auth, requireRole('INSTRUCTOR'), instructorController.requestPromotion);

module.exports = router;



// 일반 유저가 강사로 변경 시 필요 정보 입력 및 등록