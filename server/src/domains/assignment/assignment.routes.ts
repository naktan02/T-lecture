// src/domains/assignment/assignment.routes.ts
import express from 'express';
import * as assignmentController from './assignment.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// 강사: 내 배정 목록
router.get('/', auth, requireRole('INSTRUCTOR'), assignmentController.getAssignments);

// 모든 사용자: 내 배정 목록 (메시지함용 - 임시/확정 분류 포함)
router.get('/my', auth, assignmentController.getMyAssignments);

// 모든 사용자: 배정 응답
router.post('/:unitScheduleId/response', auth, assignmentController.respondAssignment);

// 강사: 이력
router.get('/history', auth, requireRole('INSTRUCTOR'), assignmentController.getWorkHistory);

// 관리자: 후보
router.get('/candidates', auth, requireRole('ADMIN'), assignmentController.getCandidates);

// 관리자: 자동배정 실행
router.post('/auto-assign', auth, requireRole('ADMIN'), assignmentController.autoAssign);

// 관리자: 자동배정 미리보기
router.post('/preview', auth, requireRole('ADMIN'), assignmentController.previewAutoAssign);

// 관리자: 배정 일괄 저장
router.post('/bulk-save', auth, requireRole('ADMIN'), assignmentController.bulkSaveAssignments);

// 관리자: 배정 취소
router.patch(
  '/:unitScheduleId/cancel',
  auth,
  requireRole('ADMIN'),
  assignmentController.cancelAssignmentByAdmin,
);

// 관리자: 스케줄 배정 막기/해제
router.patch(
  '/:unitScheduleId/block',
  auth,
  requireRole('ADMIN'),
  assignmentController.blockSchedule,
);

// 관리자: 부대 전체 스케줄 일괄 배정막기/해제
router.patch(
  '/unit/:unitId/bulk-block',
  auth,
  requireRole('ADMIN'),
  assignmentController.bulkBlockUnit,
);

export default router;

// CommonJS 호환
module.exports = router;
