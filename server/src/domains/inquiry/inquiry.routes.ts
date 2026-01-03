// src/domains/inquiry/inquiry.routes.ts
import express from 'express';
import * as inquiryController from './inquiry.controller';
import { auth, requireRole } from '../../common/middlewares';

const router = express.Router();

// 문의사항 목록 조회 (인증 필요 - 관리자: 전체, 강사: 본인)
router.get('/', auth, inquiryController.getInquiries);

// 문의사항 단건 조회 (인증 필요)
router.get('/:id', auth, inquiryController.getInquiry);

// 문의사항 생성 (인증 필요)
router.post('/', auth, inquiryController.createInquiry);

// 문의사항 답변 (관리자 전용)
router.patch('/:id/answer', auth, requireRole('ADMIN'), inquiryController.answerInquiry);

// 문의사항 삭제 (인증 필요 - 본인 또는 관리자)
router.delete('/:id', auth, inquiryController.deleteInquiry);

export default router;
