// src/domains/dispatch/dispatch.routes.ts
import express from 'express';
import * as dispatchController from './dispatch.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// ==========================================
// 배정 발송 전용 라우트 (임시/확정)
// ==========================================

// 임시 배정 발송
router.post(
  '/send/temporary',
  auth,
  requireRole('ADMIN'),
  dispatchController.sendTemporaryDispatches,
);

// 확정 배정 발송
router.post(
  '/send/confirmed',
  auth,
  requireRole('ADMIN'),
  dispatchController.sendConfirmedDispatches,
);

// 내 발송함 조회
router.get('/', auth, dispatchController.getMyDispatches);

// 발송 읽음 처리
router.patch('/:dispatchId/read', auth, dispatchController.readDispatch);

export default router;
