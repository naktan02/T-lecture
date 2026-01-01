// src/domains/message/message.routes.ts
import express from 'express';
import * as messageController from './message.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// ==========================================
// 기존 메시지 관련 라우트
// ==========================================

// 임시 배정 메시지 발송
router.post('/send/temporary', auth, requireRole('ADMIN'), messageController.sendTemporaryMessages);

// 확정 배정 메시지 발송
router.post('/send/confirmed', auth, requireRole('ADMIN'), messageController.sendConfirmed);

// 내 메시지함 조회
router.get('/', auth, messageController.getMyMessages);

// 메시지 읽음 처리
router.patch('/:messageId/read', auth, messageController.readMessage);

// ==========================================
// 공지사항 관련 라우트 (/notices)
// ==========================================

// 공지사항 목록 조회 (인증 필요)
router.get('/notices', auth, messageController.getNotices);

// 공지사항 단건 조회 (인증 필요)
router.get('/notices/:id', auth, messageController.getNotice);

// 공지사항 생성 (관리자 전용)
router.post('/notices', auth, requireRole('ADMIN'), messageController.createNotice);

// 공지사항 수정 (관리자 전용)
router.put('/notices/:id', auth, requireRole('ADMIN'), messageController.updateNotice);

// 공지사항 삭제 (관리자 전용)
router.delete('/notices/:id', auth, requireRole('ADMIN'), messageController.deleteNotice);

// 공지사항 고정 토글 (관리자 전용)
router.patch('/notices/:id/pin', auth, requireRole('ADMIN'), messageController.toggleNoticePin);

export default router;

// CommonJS 호환
module.exports = router;
