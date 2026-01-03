// src/domains/metadata/metadata.controller.ts
import { Request, Response } from 'express';
import metadataService from './metadata.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';

// [강사 가입용] 메타데이터 통합 조회
export const getInstructorMeta = asyncHandler(async (req: Request, res: Response) => {
  const data = await metadataService.getInstructorMeta();
  res.status(200).json(data);
});

// [관리자/공통] 팀 목록 조회
export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const teams = await metadataService.getAllTeams();
  res.status(200).json(teams);
});

// [관리자/공통] 덕목 목록 조회
export const getVirtues = asyncHandler(async (req: Request, res: Response) => {
  const virtues = await metadataService.getAllVirtues();
  res.status(200).json(virtues);
});

// [관리자] 메시지 템플릿 목록 조회
export const getMessageTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = await metadataService.getMessageTemplates();
  res.status(200).json(templates);
});

// 팀 생성
export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (name === undefined) {
    throw new AppError('팀 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const created = await metadataService.createTeam(name);
  res.status(201).json(created);
});

// 팀 수정
export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  if (name === undefined) {
    throw new AppError('팀 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateTeam(id, name);
  res.status(200).json(updated);
});

// 팀 삭제 (Soft Delete)
export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await metadataService.deleteTeam(id);
  res.status(200).json({ message: '팀이 삭제되었습니다.' });
});

// 덕목 생성
export const createVirtue = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (name === undefined) {
    throw new AppError('덕목 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const created = await metadataService.createVirtue(name);
  res.status(201).json(created);
});

// 덕목 수정
export const updateVirtue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (name === undefined) {
    throw new AppError('덕목 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateVirtue(id, name);
  res.status(200).json(updated);
});

// 덕목 삭제 (Hard Delete)
export const deleteVirtue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await metadataService.deleteVirtue(id);
  res.status(200).json({ message: '덕목이 삭제되었습니다.' });
});

// 메시지 템플릿 수정 (body와 formatPresets는 JSONB)
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { title, body, formatPresets } = req.body;

  if (title === undefined || !body || !Array.isArray(body?.tokens)) {
    throw new AppError(
      '템플릿 제목(title)과 본문(body.tokens)이 필요합니다.',
      400,
      'VALIDATION_ERROR',
    );
  }

  const updated = await metadataService.updateMessageTemplate(key, title, body, formatPresets);
  res.status(200).json(updated);
});

// ===== 배정 설정 (SystemConfig) =====

// 배정 설정 조회
export const getAssignmentConfigs = asyncHandler(async (req: Request, res: Response) => {
  const configs = await metadataService.getAssignmentConfigs();
  res.status(200).json(configs);
});

// 배정 설정 수정
export const updateAssignmentConfig = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    throw new AppError('설정 값(value)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateAssignmentConfig(key, String(value));
  res.status(200).json(updated);
});

// ===== 패널티 관리 (InstructorPenalty) =====

// 패널티 목록 조회
export const getPenalties = asyncHandler(async (req: Request, res: Response) => {
  const penalties = await metadataService.getPenalties();
  res.status(200).json(penalties);
});

// 패널티 추가
export const addPenalty = asyncHandler(async (req: Request, res: Response) => {
  const { userId, days } = req.body;

  if (!userId || !days) {
    throw new AppError('userId와 days가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const penalty = await metadataService.addPenalty(Number(userId), Number(days));
  res.status(201).json(penalty);
});

// 패널티 만료일 수정
export const updatePenalty = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { expiresAt } = req.body;

  if (!expiresAt) {
    throw new AppError('만료일(expiresAt)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updatePenaltyExpiration(
    Number(userId),
    new Date(expiresAt),
  );
  res.status(200).json(updated);
});

// 패널티 삭제
export const deletePenalty = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  await metadataService.deletePenalty(Number(userId));
  res.status(200).json({ message: '패널티가 삭제되었습니다.' });
});

// ===== 우선배정 크레딧 (InstructorPriorityCredit) =====

// 우선배정 크레딧 목록 조회
export const getPriorityCredits = asyncHandler(async (req: Request, res: Response) => {
  const credits = await metadataService.getPriorityCredits();
  res.status(200).json(credits);
});

// 우선배정 크레딧 추가
export const addPriorityCredit = asyncHandler(async (req: Request, res: Response) => {
  const { instructorId, credits = 1 } = req.body;

  if (!instructorId) {
    throw new AppError('instructorId가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const credit = await metadataService.addPriorityCredit(Number(instructorId), Number(credits));
  res.status(201).json(credit);
});

// 우선배정 크레딧 수정
export const updatePriorityCredit = asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  const { credits } = req.body;

  if (credits === undefined) {
    throw new AppError('credits가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updatePriorityCredit(Number(instructorId), Number(credits));
  res.status(200).json(updated);
});

// 우선배정 크레딧 삭제
export const deletePriorityCredit = asyncHandler(async (req: Request, res: Response) => {
  const { instructorId } = req.params;
  await metadataService.deletePriorityCredit(Number(instructorId));
  res.status(200).json({ message: '우선배정 크레딧이 삭제되었습니다.' });
});

// CommonJS 호환
module.exports = {
  getInstructorMeta,
  getTeams,
  getVirtues,
  getMessageTemplates,
  createTeam,
  updateTeam,
  deleteTeam,
  createVirtue,
  updateVirtue,
  deleteVirtue,
  updateTemplate,
  getAssignmentConfigs,
  updateAssignmentConfig,
  getPenalties,
  addPenalty,
  updatePenalty,
  deletePenalty,
  getPriorityCredits,
  addPriorityCredit,
  updatePriorityCredit,
  deletePriorityCredit,
};
