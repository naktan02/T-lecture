// src/domains/metadata/metadata.controller.js
const metadataService = require('./metadata.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError'); 

// [강사 가입용] 메타데이터 통합 조회
exports.getInstructorMeta = asyncHandler(async (req, res) => {
  const data = await metadataService.getInstructorMeta();
  res.status(200).json(data);
});

// [관리자/공통] 팀 목록 조회
exports.getTeams = asyncHandler(async (req, res) => {
  const teams = await metadataService.getAllTeams();
  res.status(200).json(teams);
});

// [관리자/공통] 덕목 목록 조회
exports.getVirtues = asyncHandler(async (req, res) => {
  const virtues = await metadataService.getAllVirtues();
  res.status(200).json(virtues);
});

// [관리자] 메시지 템플릿 목록 조회
exports.getMessageTemplates = asyncHandler(async (req, res) => {
  const templates = await metadataService.getMessageTemplates();
  res.status(200).json(templates);
});

// 팀 수정
exports.updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (name === undefined) {
    throw new AppError('팀 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateTeam(id, name);
  res.status(200).json(updated);
});

// 덕목 수정
exports.updateVirtue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (name === undefined) {
    throw new AppError('덕목 이름(name)이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateVirtue(id, name);
  res.status(200).json(updated);
});

// 메시지 템플릿 수정
exports.updateTemplate = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { title, body } = req.body;

  if (title === undefined || body === undefined) {
    throw new AppError('템플릿 제목(title)과 본문(body)이 모두 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const updated = await metadataService.updateMessageTemplate(key, title, body);
  res.status(200).json(updated);
});