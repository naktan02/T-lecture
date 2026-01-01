// src/domains/message/message.controller.ts
import { Request, Response } from 'express';
import messageService from './message.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// ==========================================
// 기존 메시지 관련 컨트롤러
// ==========================================

// 임시 배정 메시지 일괄 발송
export const sendTemporaryMessages = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[Message] Sending temporary messages...');
  const result = await messageService.sendTemporaryMessages();
  res.json(result);
});

// 확정 배정 메시지 일괄 발송
export const sendConfirmed = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[Message] Sending confirmed messages...');
  const result = await messageService.sendConfirmedMessages();
  res.json(result);
});

// 내 메시지함 조회
export const getMyMessages = asyncHandler(async (req: Request, res: Response) => {
  const messages = await messageService.getMyMessages(req.user!.id);
  res.json(messages);
});

// 메시지 읽음 처리
export const readMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  if (!messageId) {
    throw new AppError('messageId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  await messageService.readMessage(req.user!.id, messageId);
  res.json({ message: '읽음 처리되었습니다.' });
});

// ==========================================
// 공지사항 관련 컨트롤러
// ==========================================

// 공지사항 목록 조회
export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query;
  const result = await messageService.getNotices({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string | undefined,
  });
  res.json(result);
});

// 공지사항 단건 조회
export const getNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notice = await messageService.getNotice(Number(id));
  res.json(notice);
});

// 공지사항 생성 (관리자 전용)
export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, isPinned } = req.body;
  const authorId = req.user!.id;
  const notice = await messageService.createNotice({ title, content, isPinned }, authorId);
  res.status(201).json(notice);
});

// 공지사항 수정 (관리자 전용)
export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, isPinned } = req.body;
  const notice = await messageService.updateNotice(Number(id), { title, content, isPinned });
  res.json(notice);
});

// 공지사항 삭제 (관리자 전용)
export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await messageService.deleteNotice(Number(id));
  res.status(204).send();
});

// 공지사항 고정 토글 (관리자 전용)
export const toggleNoticePin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const notice = await messageService.toggleNoticePin(Number(id));
  res.json(notice);
});

// ==========================================
// 문의사항 관련 컨트롤러
// ==========================================

// 문의사항 목록 조회
export const getInquiries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, search } = req.query;
  const isAdmin = req.user?.isAdmin === true;

  const result = await messageService.getInquiries({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    // 관리자는 전체, 강사는 본인 문의만
    authorId: isAdmin ? undefined : req.user!.id,
    status: status as 'Waiting' | 'Answered' | undefined,
    search: search as string | undefined,
  });
  res.json(result);
});

// 문의사항 단건 조회
export const getInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user?.isAdmin === true;
  const inquiry = await messageService.getInquiry(Number(id), req.user!.id, isAdmin);
  res.json(inquiry);
});

// 문의사항 생성 (강사)
export const createInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;
  const authorId = req.user!.id;
  const inquiry = await messageService.createInquiry({ title, content }, authorId);
  res.status(201).json(inquiry);
});

// 문의사항 답변 (관리자 전용)
export const answerInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { answer } = req.body;
  const answeredBy = req.user!.id;
  const inquiry = await messageService.answerInquiry(Number(id), answer, answeredBy);
  res.json(inquiry);
});

// 문의사항 삭제
export const deleteInquiry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isAdmin = req.user?.isAdmin === true;
  await messageService.deleteInquiry(Number(id), req.user!.id, isAdmin);
  res.status(204).send();
});

// CommonJS 호환
module.exports = {
  sendTemporaryMessages,
  sendConfirmed,
  getMyMessages,
  readMessage,
  getNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  toggleNoticePin,
  getInquiries,
  getInquiry,
  createInquiry,
  answerInquiry,
  deleteInquiry,
};
