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

// [배정 후보 데이터 조회] (부대 + 강사 + 기존 배정)
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

  // 배정 현황을 분류별로 분리 (Temporary=배정작업공간, Confirmed=확정)
  const pendingAssignments = assignmentDTO.toHierarchicalResponse(unitsRaw, 'Temporary');
  const acceptedAssignments = assignmentDTO.toHierarchicalResponse(unitsRaw, 'Confirmed');

  res.json({
    ...responseData,
    pendingAssignments, // 임시 배정 (배정 작업 공간)
    acceptedAssignments, // 확정 배정 (확정 배정 완료)
  });
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

// [자동 배정 미리보기]
export const previewAutoAssign = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, debugTopK: bodyDebugTopK } = req.body;
  const queryDebugTopK = req.query.debugTopK;

  // debugTopK: query 또는 body에서 받음 (기본값 0)
  const debugTopK = Number(queryDebugTopK ?? bodyDebugTopK ?? 0) || 0;

  if (!startDate || !endDate) {
    throw new AppError('기간(startDate, endDate)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const s = new Date(startDate);
  const e = new Date(endDate);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[assignment.previewAutoAssign] Start', {
    userId: req.user!.id,
    startDate,
    endDate,
    debugTopK,
  });

  const result = await assignmentService.previewAutoAssignments(s, e, debugTopK);
  res.status(200).json(result);
});

// [배정 일괄 저장]
export const bulkSaveAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { assignments } = req.body;

  if (!assignments || !Array.isArray(assignments)) {
    throw new AppError('저장할 배정 목록(assignments)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  logger.info('[assignment.bulkSave]', {
    userId: req.user!.id,
    count: assignments.length,
  });

  const result = await assignmentService.bulkSaveAssignments(assignments);
  res.status(200).json(result);
});

// [스케줄 배정 막기/해제]
export const blockSchedule = asyncHandler(async (req: Request, res: Response) => {
  const unitScheduleId = Number(req.params.unitScheduleId);
  const { isBlocked } = req.body;

  if (!Number.isFinite(unitScheduleId)) {
    throw new AppError('unitScheduleId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  if (typeof isBlocked !== 'boolean') {
    throw new AppError('isBlocked(boolean)가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await assignmentService.toggleScheduleBlock(unitScheduleId, isBlocked);
  res
    .status(200)
    .json({ message: isBlocked ? '배정이 막혔습니다.' : '배정 막기가 해제되었습니다.', result });
});

// [내 배정 목록 조회] (강사용 메시지함)
export const getMyAssignments = asyncHandler(async (req: Request, res: Response) => {
  const assignments = await assignmentService.getMyAssignments(req.user!.id);

  // 임시/확정 분류별로 그룹화
  const temporary = assignments.filter((a) => a.classification === 'Temporary');
  const confirmed = assignments.filter((a) => a.classification === 'Confirmed');

  res.json({
    temporary,
    confirmed,
    total: assignments.length,
  });
});

// [부대 전체 스케줄 일괄 배정막기/해제]
export const bulkBlockUnit = asyncHandler(async (req: Request, res: Response) => {
  const unitId = Number(req.params.unitId);
  const { isBlocked } = req.body;

  if (!Number.isFinite(unitId)) {
    throw new AppError('unitId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  if (typeof isBlocked !== 'boolean') {
    throw new AppError('isBlocked(boolean)가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await assignmentService.bulkBlockUnit(unitId, isBlocked);
  res.status(200).json({
    message: isBlocked ? '부대 전체 배정막기 완료' : '부대 전체 배정막기 해제',
    count: result.count,
  });
});

// CommonJS 호환
module.exports = {
  getWorkHistory,
  getAssignments,
  respondAssignment,
  getCandidates,
  autoAssign,
  previewAutoAssign,
  bulkSaveAssignments,
  cancelAssignmentByAdmin,
  blockSchedule,
  getMyAssignments,
  bulkBlockUnit,
};
