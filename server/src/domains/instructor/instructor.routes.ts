// server/src/domains/instructor/instructor.routes.ts
import express from 'express';
import * as instructorController from './instructor.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// 근무 가능일 조회
router.get('/availability', auth, requireRole('INSTRUCTOR'), instructorController.getAvailability);

// 근무 가능일 수정
router.put(
  '/availability',
  auth,
  requireRole('INSTRUCTOR'),
  instructorController.updateAvailability,
);

// 내 통계 조회
router.get('/stats', auth, requireRole('INSTRUCTOR'), instructorController.getMyStats);

// 강의 가능 과목 수정
router.put('/virtues', auth, requireRole('INSTRUCTOR'), instructorController.updateVirtues);

// 승급 신청
router.post('/promotion', auth, requireRole('INSTRUCTOR'), instructorController.requestPromotion);

export default router;

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = router;
