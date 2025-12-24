// server/src/domains/assignment/assignment.controller.ts
import { Request, Response } from 'express';
import assignmentService from './assignment.service';
import assignmentDTO from './assignment.dto';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';
import logger from '../../config/logger';

// [근무 이력 조회] (Confirmed + Past)
export const getWorkHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await assignmentService.getWorkHistory(req.user!.id);
  res.json(history);
});

// [배정 목록 조회] (Active + Future)
export const getAssignments = asyncHandler(async (req: Request, res: Response) => {
  const assignments = await assignmentService.getUpcomingAssignments(req.user!.id);
  res.json(assignments);
});

// [임시 배정 응답] (수락/거절)
export const respondAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { unitScheduleId } = req.params;
  const { response } = req.body || {};

  if (!unitScheduleId || !response) {
    throw new AppError('필수 파라미터가 누락되었습니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[assignment.respond]', {
    userId: req.user!.id,
    unitScheduleId,
    response,
  });

  const result = await assignmentService.respondToAssignment(
    req.user!.id,
    unitScheduleId,
    response,
  );

  res.json(result);
});

// [배정 후보 데이터 조회] (부대 + 강사)
export const getCandidates = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query || {};

  if (!startDate || !endDate) {
    throw new AppError('조회 기간이 필요합니다. (startDate, endDate)', 400, 'VALIDATION_ERROR');
  }

  const { unitsRaw, instructorsRaw } = await assignmentService.getAssignmentCandidatesRaw(
    startDate as string,
    endDate as string,
  );

  const responseData = assignmentDTO.toCandidateResponse(unitsRaw, instructorsRaw);

  res.json(responseData);
});

//자동 배정 실행
export const autoAssign = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    throw new AppError('기간(startDate, endDate)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const s = new Date(startDate);
  const e = new Date(endDate);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[assignment.autoAssign] Start', {
    userId: req.user!.id,
    startDate,
    endDate,
  });

  const result = await assignmentService.createAutoAssignments(s, e);

  res.status(200).json(result);
});

// [배정 취소]
export const cancelAssignmentByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const unitScheduleId = Number(req.params.unitScheduleId);
  const instructorId = Number(req.body.instructorId);

  if (!Number.isFinite(unitScheduleId) || !Number.isFinite(instructorId)) {
    throw new AppError('unitScheduleId와 instructorId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }
  const result = await assignmentService.cancelAssignment(
    req.user!.id,
    req.user!.isAdmin ? (req.user!.adminLevel === 'SUPER' ? 'SUPER' : 'ADMIN') : 'USER',
    instructorId,
    unitScheduleId,
  );

  res.json(result);
});

// CommonJS 호환
module.exports = {
  getWorkHistory,
  getAssignments,
  respondAssignment,
  getCandidates,
  autoAssign,
  cancelAssignmentByAdmin,
};
