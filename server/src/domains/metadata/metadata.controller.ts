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

// 메시지 템플릿 수정
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { title, body } = req.body;

  if (title === undefined || body === undefined) {
    throw new AppError(
      '템플릿 제목(title)과 본문(body)이 모두 필요합니다.',
      400,
      'VALIDATION_ERROR',
    );
  }

  const updated = await metadataService.updateMessageTemplate(key, title, body);
  res.status(200).json(updated);
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
};
