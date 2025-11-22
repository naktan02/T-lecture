// web/server/src/api/v1/instructor.routes.js
const express = require('express');
const router = express.Router();

const instructorController = require('../controllers/instructor.controller');
const { auth, requireRole } = require('../../../common/middlewares');

// [수정] 미들웨어를 각 API 엔드포인트에 개별 적용

// 1. 근무 가능일 조회
// GET /api/v1/instructor/availability
router.get('/availability', auth, requireRole('INSTRUCTOR'), instructorController.getAvailability);

// 2. 근무 가능일 수정
// PUT /api/v1/instructor/availability
router.put('/availability', auth, requireRole('INSTRUCTOR'), instructorController.updateAvailability);

// 3. 근무 이력 조회 (Confirmed & Past)
// GET /api/v1/instructor/history
router.get('/history', auth, requireRole('INSTRUCTOR'), instructorController.getWorkHistory);

// 4. 배정 목록 조회 (Active & Future)
// GET /api/v1/instructor/assignments
router.get('/assignments', auth, requireRole('INSTRUCTOR'), instructorController.getAssignments);

// 5. 확정 배정 상세 조회
// GET /api/v1/instructor/assignments/:unitScheduleId
router.get('/assignments/:unitScheduleId', auth, requireRole('INSTRUCTOR'), instructorController.getAssignmentDetail);

// 6. 임시 배정 응답 (수락/거절)
// POST /api/v1/instructor/assignments/:unitScheduleId/response
router.post('/assignments/:unitScheduleId/response', auth, requireRole('INSTRUCTOR'), instructorController.respondAssignment);

module.exports = router;