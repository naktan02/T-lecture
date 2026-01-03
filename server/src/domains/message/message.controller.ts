// src/domains/message/message.controller.ts
import { Request, Response } from 'express';
import messageService from './message.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// ==========================================
// 배정 메시지 관련 컨트롤러 (임시/확정)
// ==========================================

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

// 내 메시지함 조회 (페이지네이션 지원)
export const getMyMessages = asyncHandler(async (req: Request, res: Response) => {
  const { type, page, limit } = req.query;

  const result = await messageService.getMyMessages(req.user!.id, {
    type: type === 'Temporary' || type === 'Confirmed' ? type : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
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
