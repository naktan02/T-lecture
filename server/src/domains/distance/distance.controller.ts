// server/src/domains/distance/distance.controller.ts
import { Request, Response } from 'express';
import distanceService from './distance.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// 강사-부대 간 이미 계산된 거리 조회
export const getDistance = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = Number(req.params.instructorId);
  const unitId = Number(req.params.unitId);

  if (!Number.isFinite(instructorId) || !Number.isFinite(unitId)) {
    throw new AppError('instructorId/unitId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
  }

  const record = await distanceService.getDistance(instructorId, unitId);
  res.json(record);
});

// 특정 강사 기준으로 거리 범위 내 부대 리스트 조회
export const getUnitsWithinDistance = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = Number(req.params.instructorId);
  const min = Number(req.query.min ?? 0);
  const max = Number(req.query.max ?? 999999);

  if (!Number.isFinite(instructorId)) {
    throw new AppError('instructorId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
    throw new AppError('min/max 값이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
  }

  const units = await distanceService.getUnitsWithinDistance(instructorId, min, max);
  res.json(units);
});

// 특정 강사-부대 간 거리 계산 및 저장
export const calculateSpecificDistance = asyncHandler(async (req: Request, res: Response) => {
  const { instructorId, unitId } = req.body;

  if (!instructorId || !unitId) {
    throw new AppError('instructorId와 unitId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await distanceService.calculateAndSaveDistance(instructorId, unitId);
  res.json(result);
});

// 특정 부대 기준으로 거리 범위 내 강사 리스트 조회
export const getInstructorsNearUnit = asyncHandler(async (req: Request, res: Response) => {
  const unitId = Number(req.params.unitId);
  const min = Number(req.query.min ?? 0);
  const max = Number(req.query.max ?? 999999);

  if (!Number.isFinite(unitId) || unitId <= 0) {
    throw new AppError('unitId는 유효한 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
  }

  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
    throw new AppError('min/max 값이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
  }

  const instructors = await distanceService.getInstructorsWithinDistance(unitId, min, max);
  res.json(instructors);
});

// 카카오 API 사용량(오늘) 조회
export const getTodayUsage = asyncHandler(async (req: Request, res: Response) => {
  const usage = await distanceService.getTodayUsage();
  res.json(usage);
});

// 수동 배치 1회 실행 (관리자 버튼용)
export const runDailyBatchOnce = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.body?.limit ?? 200);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new AppError('limit는 양의 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[distance.batch.run]', {
    userId: req.user?.id ?? null,
    limit,
  });

  const result = await distanceService.calculateDistancesBySchedulePriority(limit);
  res.json(result);
});

// CommonJS 호환
module.exports = {
  getDistance,
  getUnitsWithinDistance,
  calculateSpecificDistance,
  getInstructorsNearUnit,
  getTodayUsage,
  runDailyBatchOnce,
};
