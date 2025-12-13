// server/src/domains/unit/unit.controller.js
const unitService = require('./unit.service');
const excelService = require('../../infra/excel.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');

// [변경] 부대 목록 조회 요청 처리
exports.getUnitList = asyncHandler(async (req, res) => {
  const data = await unitService.searchUnitList(req.query);
  
  res.status(200).json({
    result: "Success",
    data: data 
  });
});

// [변경] 단건 부대 등록 요청 처리
exports.registerSingleUnit = asyncHandler(async (req, res) => {
  const unit = await unitService.registerSingleUnit(req.body);
  
  res.status(201).json({
    result: "Success",
    data: unit
  });
});

// [신규] 엑셀 파일 업로드 및 일괄 등록 처리
exports.uploadExcelAndRegisterUnits = asyncHandler(async (req, res) => {
  // 파일 유무 확인은 '요청 파싱' 단계이므로 컨트롤러가 담당하되, AppError 사용
  if (!req.file) {
    throw new AppError('파일이 업로드되지 않았습니다.', 400, 'VALIDATION_ERROR');
  }

  const rawRows = excelService.bufferToJson(req.file.buffer);
  const result = await unitService.processExcelDataAndRegisterUnits(rawRows);

  res.status(201).json({ 
    result: "Success",
    message: `${result.count}개 부대 정보가 성공적으로 등록되었습니다.`,
    data: result
  });
});

// [변경] 부대 상세 정보 조회 처리
exports.getUnitDetail = asyncHandler(async (req, res) => {
  const unit = await unitService.getUnitDetailWithSchedules(req.params.id);
  
  res.status(200).json({
    result: "Success",
    data: unit
  });
});

// [신규] 부대 기본 정보 수정 요청 처리
exports.updateBasicInfo = asyncHandler(async (req, res) => {
  const unit = await unitService.modifyUnitBasicInfo(req.params.id, req.body);
  
  res.status(200).json({
    result: "Success",
    data: unit
  });
});

// [신규] 부대 담당자 정보 수정 요청 처리
exports.updateOfficerInfo = asyncHandler(async (req, res) => {
  const unit = await unitService.modifyUnitContactInfo(req.params.id, req.body);
  
  res.status(200).json({
    result: "Success",
    data: unit
  });
});

// [신규] 일정 추가 요청 처리
exports.addSchedule = asyncHandler(async (req, res) => {
  // 검증 로직 제거 -> 서비스로 이동
  const result = await unitService.addScheduleToUnit(req.params.id, req.body.date);
  
  res.status(201).json({ 
    result: "Success", 
    data: result 
  });
});

// [신규] 일정 삭제 요청 처리
exports.removeSchedule = asyncHandler(async (req, res) => {
  await unitService.removeScheduleFromUnit(req.params.scheduleId);
  
  res.status(200).json({ 
    result: "Success", 
    message: '일정이 삭제되었습니다.' 
  });
});

// [변경] 부대 삭제 요청 처리
exports.deleteUnit = asyncHandler(async (req, res) => {
  await unitService.removeUnitPermanently(req.params.id);
  res.status(204).send();
});