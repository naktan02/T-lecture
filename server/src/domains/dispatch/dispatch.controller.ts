// src/domains/dispatch/dispatch.controller.ts
import { Request, Response } from 'express';
import dispatchService from './dispatch.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// ==========================================
// 배정 발송 관련 컨트롤러 (임시/확정)
// ==========================================

// 임시 배정 발송 일괄 발송 (날짜 범위 필터링)
export const sendTemporaryDispatches = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  logger.info('[Dispatch] Sending temporary dispatches...', { startDate, endDate });
  const result = await dispatchService.sendTemporaryDispatches(
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined,
  );
  res.json(result);
});

// 확정 배정 발송 일괄 발송 (날짜 범위 필터링)
export const sendConfirmedDispatches = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await dispatchService.sendConfirmedDispatches(
    startDate ? String(startDate) : undefined,
    endDate ? String(endDate) : undefined,
  );
  res.json(result);
});

// 내 발송함 조회 (페이지네이션 지원)
export const getMyDispatches = asyncHandler(async (req: Request, res: Response) => {
  const { type, page, limit } = req.query;

  const result = await dispatchService.getMyDispatches(req.user!.id, {
    type: type === 'Temporary' || type === 'Confirmed' ? type : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.json(result);
});

// 발송 읽음 처리
export const readDispatch = asyncHandler(async (req: Request, res: Response) => {
  const { dispatchId } = req.params;
  if (!dispatchId) {
    throw new AppError('dispatchId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  await dispatchService.readDispatch(req.user!.id, dispatchId);
  res.json({ message: '읽음 처리되었습니다.' });
});
