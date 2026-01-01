// src/domains/message/message.controller.ts
import { Request, Response } from 'express';
import messageService from './message.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

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

// CommonJS 호환
module.exports = {
  sendTemporaryMessages,
  sendConfirmed,
  getMyMessages,
  readMessage,
};
