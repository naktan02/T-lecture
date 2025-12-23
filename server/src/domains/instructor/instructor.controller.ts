// server/src/domains/instructor/instructor.controller.ts
import { Request, Response } from 'express';
import instructorService from './instructor.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';

// 근무 가능일 조회
export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { year, month } = req.query;
  if (!year || !month)
    throw new AppError('연도(year)와 월(month) 파라미터가 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await instructorService.getAvailabilities(
    req.user!.id,
    Number(year),
    Number(month),
  );
  res.json(result);
});

// 근무 가능일 수정
export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { year, month, dates } = req.body;
  if (!year || !month || !Array.isArray(dates))
    throw new AppError('잘못된 요청 데이터입니다.', 400, 'VALIDATION_ERROR');

  const result = await instructorService.updateAvailabilities(
    req.user!.id,
    Number(year),
    Number(month),
    dates,
  );
  res.json(result);
});

// 강사 통계 조회
export const getMyStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await instructorService.getInstructorStats(req.user!.id);
  res.json(stats);
});

// 강의 가능 과목 수정
export const updateVirtues = asyncHandler(async (req: Request, res: Response) => {
  const { virtueIds } = req.body; // ex: [1, 2]
  if (!Array.isArray(virtueIds))
    throw new AppError('virtueIds는 배열이어야 합니다.', 400, 'VALIDATION_ERROR');

  const result = await instructorService.updateVirtues(req.user!.id, virtueIds);
  res.json(result);
});

// 승급 신청
export const requestPromotion = asyncHandler(async (req: Request, res: Response) => {
  const { desiredLevel } = req.body; // 예: 'Main' (주강사)
  if (!desiredLevel)
    throw new AppError('희망하는 승급 등급(desiredLevel)을 입력해주세요.', 400, 'VALIDATION_ERROR');

  const result = await instructorService.requestPromotion(req.user!.id, desiredLevel);
  res.json(result);
});

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = {
  getAvailability,
  updateAvailability,
  getMyStats,
  updateVirtues,
  requestPromotion,
};
