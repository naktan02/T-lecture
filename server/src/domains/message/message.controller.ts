// src/domains/message/message.controller.ts
import { Request, Response } from 'express';
import messageService from './message.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// 공지사항 작성
export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const { title, body } = req.body;
  if (!title || !body) {
    throw new AppError('제목과 본문을 모두 입력해주세요.', 400, 'VALIDATION_ERROR');
  }
  logger.info('[Message] Creating notice...', { title });
  const result = await messageService.createNotice(title, body);
  res.status(201).json(result);
});

// 공지사항 목록 조회
export const getNotices = asyncHandler(async (req: Request, res: Response) => {
  const notices = await messageService.getNotices();
  res.json(notices);
});

// 임시 배정 메시지 일괄 발송 (날짜 범위 필터링)
export const sendTemporaryMessages = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  logger.info('[Message] Sending temporary messages...', { startDate, endDate });
  const result = await messageService.sendTemporaryMessages(
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined,
  );
  res.json(result);
});

// 확정 배정 메시지 일괄 발송
export const sendConfirmedMessages = asyncHandler(async (req: Request, res: Response) => {
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

// CommonJS 호환
module.exports = {
  createNotice,
  getNotices,
  sendTemporaryMessages,
  sendConfirmedMessages,
  getMyMessages,
  readMessage,
};
