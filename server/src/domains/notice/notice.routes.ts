// src/domains/notice/notice.routes.ts
import express from 'express';
import * as noticeController from './notice.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// 공지사항 목록 조회 (인증 필요)
router.get('/', auth, noticeController.getNotices);

// 공지사항 단건 조회 (인증 필요)
router.get('/:id', auth, noticeController.getNotice);

// 공지사항 생성 (관리자 전용)
router.post('/', auth, requireRole('ADMIN'), noticeController.createNotice);

// 공지사항 수정 (관리자 전용)
router.put('/:id', auth, requireRole('ADMIN'), noticeController.updateNotice);

// 공지사항 삭제 (관리자 전용)
router.delete('/:id', auth, requireRole('ADMIN'), noticeController.deleteNotice);

// 공지사항 고정 토글 (관리자 전용)
router.patch('/:id/pin', auth, requireRole('ADMIN'), noticeController.toggleNoticePin);

export default router;
