// src/domains/assignment/assignment.routes.js
const router = require('express').Router();
const assignmentController = require('./assignment.controller');
const { auth, requireRole } = require('../../common/middlewares');


router.get(
    '/assignments',
    auth,
    requireRole('INSTRUCTOR'),
    assignmentController.getAssignments,
);
// 배정 상세 조회
router.get(
    '/assignments/:unitScheduleId',
    auth,
    requireRole('INSTRUCTOR'),
    assignmentController.getAssignmentDetail,
);
// 임시 배정 응답
router.post(
    '/assignments/:unitScheduleId/response',
    auth,
    requireRole('INSTRUCTOR'),
    assignmentController.respondAssignment,
);
// 근무 이력 조회 (Confirmed & Past)
router.get(
    '/history',
    auth,
    requireRole('INSTRUCTOR'),
    assignmentController.getWorkHistory
);
// 자동 배정 실행
router.post(
    '/auto-assign',
    auth,
    requireRole('ADMIN'),
    assignmentController.autoAssign
);
// 배정 후보 조회
router.get(
    '/candidates',
    auth,
    requireRole('ADMIN'), 
    assignmentController.getCandidates
);
module.exports = router;
