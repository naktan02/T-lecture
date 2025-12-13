// src/domains/assignment/assignment.routes.js
const router = require('express').Router();
const assignmentController = require('./assignment.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 강사: 내 배정 목록
router.get('/', auth, requireRole('INSTRUCTOR'), assignmentController.getAssignments);

// 강사: 배정 응답
router.post('/:unitScheduleId/response', auth, requireRole('INSTRUCTOR'), assignmentController.respondAssignment);

// 강사: 이력
router.get('/history', auth, requireRole('INSTRUCTOR'), assignmentController.getWorkHistory);

// 관리자: 후보
router.get('/candidates', auth, requireRole('ADMIN'), assignmentController.getCandidates);

// 관리자: 자동배정 실행
router.post('/auto-assign', auth, requireRole('ADMIN'), assignmentController.autoAssign);

// 관리자: 배정 취소 
router.patch('/:unitScheduleId/cancel', auth, requireRole('ADMIN'), assignmentController.cancelAssignmentByAdmin);


module.exports = router;
