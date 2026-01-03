// src/domains/message/message.routes.ts
import express from 'express';
import * as messageController from './message.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// ==========================================
// 배정 메시지 전용 라우트 (임시/확정)
// ==========================================

// 임시 배정 메시지 발송
router.post('/send/temporary', auth, requireRole('ADMIN'), messageController.sendTemporaryMessages);

// 확정 배정 메시지 발송
router.post('/send/confirmed', auth, requireRole('ADMIN'), messageController.sendConfirmedMessages);

// 내 메시지함 조회
router.get('/', auth, messageController.getMyMessages);

// 메시지 읽음 처리
router.patch('/:messageId/read', auth, messageController.readMessage);

export default router;
