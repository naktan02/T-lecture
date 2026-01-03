// server/src/domains/unit/unit.controller.ts
import { Request, Response } from 'express';
import unitService from './unit.service';
import excelService from '../../infra/excel.service';
import asyncHandler from '../../common/middlewares/asyncHandler';
import AppError from '../../common/errors/AppError';

// 부대 목록 조회
export const getUnitList = asyncHandler(async (req: Request, res: Response) => {
  const data = await unitService.searchUnitList(req.query);

  res.status(200).json({
    result: 'Success',
    data: data,
  });
});

// 단건 부대 등록
export const registerSingleUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.registerSingleUnit(req.body);

  res.status(201).json({
    result: 'Success',
    data: unit,
  });
});

// 엑셀 파일 업로드 및 부대 일괄 등록
export const uploadExcelAndRegisterUnits = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('파일이 업로드되지 않았습니다.', 400, 'VALIDATION_ERROR');
  }

  const rawRows = await excelService.bufferToJson(req.file.buffer);
  const result = await unitService.processExcelDataAndRegisterUnits(rawRows);

  // 메시지 구성
  const messages: string[] = [];
  if (result.created > 0) messages.push(`${result.created}개 부대 생성`);
  if (result.updated > 0) messages.push(`${result.updated}개 부대 업데이트`);
  if (result.locationsSkipped > 0) messages.push(`${result.locationsSkipped}개 교육장소 중복 스킵`);

  const message = messages.length > 0 ? messages.join(', ') + ' 완료' : '처리된 데이터가 없습니다.';

  res.status(201).json({
    result: 'Success',
    message,
    data: result,
  });
});

// 부대 상세 정보 조회
export const getUnitDetail = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.getUnitDetailWithSchedules(req.params.id);

  res.status(200).json({
    result: 'Success',
    data: unit,
  });
});

// 부대 기본 정보 수정
export const updateBasicInfo = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.modifyUnitBasicInfo(req.params.id, req.body);

  res.status(200).json({
    result: 'Success',
    data: unit,
  });
});

// 부대 담당자 정보 수정
export const updateOfficerInfo = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.modifyUnitContactInfo(req.params.id, req.body);

  res.status(200).json({
    result: 'Success',
    data: unit,
  });
});

// 부대 전체 정보 수정 (기본정보 + 교육장소 + 일정)
export const updateUnitFull = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.updateUnitFull(req.params.id, req.body);

  res.status(200).json({
    result: 'Success',
    data: unit,
  });
});

// 부대 일정 추가
export const addSchedule = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.addScheduleToUnit(req.params.id, req.body.date);

  res.status(201).json({
    result: 'Success',
    data: result,
  });
});

// 부대 일정 삭제
export const removeSchedule = asyncHandler(async (req: Request, res: Response) => {
  await unitService.removeScheduleFromUnit(req.params.scheduleId);

  res.status(200).json({
    result: 'Success',
    message: '일정이 삭제되었습니다.',
  });
});

// 부대 삭제
export const deleteUnit = asyncHandler(async (req: Request, res: Response) => {
  await unitService.removeUnitPermanently(req.params.id);
  res.status(204).send();
});

// ✅ 부대 일괄 삭제 (JS 기능 유지)
export const deleteMultipleUnits = asyncHandler(async (req: Request, res: Response) => {
  const { ids, all, filter } = req.body;

  let result;
  if (all && filter) {
    result = await unitService.removeUnitsByFilter(filter);
  } else {
    result = await unitService.removeMultipleUnits(ids);
  }

  res.status(200).json({
    result: 'Success',
    message: `${result.count}개의 부대가 삭제되었습니다.`,
  });
});

// CommonJS 호환
module.exports = {
  getUnitList,
  registerSingleUnit,
  uploadExcelAndRegisterUnits,
  getUnitDetail,
  updateBasicInfo,
  updateOfficerInfo,
  updateUnitFull,
  addSchedule,
  removeSchedule,
  deleteUnit,
  deleteMultipleUnits,
};
