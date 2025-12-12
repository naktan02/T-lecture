// server/src/domains/unit/unit.controller.js
const unitService = require('./unit.service');
const excelService = require('../../infra/excel.service');

// [변경] 부대 목록 조회 요청 처리
exports.getUnitList = async (req, res) => {
  try {
    const result = await unitService.searchUnitList(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [변경] 단건 부대 등록 요청 처리
exports.registerSingleUnit = async (req, res) => {
  try {
    const unit = await unitService.registerSingleUnit(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [신규] 엑셀 파일 업로드 및 일괄 등록 처리
exports.uploadExcelAndRegisterUnits = async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }

    const rawRows = excelService.bufferToJson(req.file.buffer);
    const result = await unitService.processExcelDataAndRegisterUnits(rawRows);

    res.status(201).json({ 
      message: `${result.count}개 부대 정보가 성공적으로 등록되었습니다.` 
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [변경] 부대 상세 정보 조회 처리
exports.getUnitDetail = async (req, res) => {
  try {
    const unit = await unitService.getUnitDetailWithSchedules(req.params.id);
    res.json(unit);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// [신규] 부대 기본 정보 수정 요청 처리
exports.updateBasicInfo = async (req, res) => {
  try {
    const unit = await unitService.modifyUnitBasicInfo(req.params.id, req.body);
    res.json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [신규] 부대 담당자 정보 수정 요청 처리
exports.updateOfficerInfo = async (req, res) => {
  try {
    const unit = await unitService.modifyUnitContactInfo(req.params.id, req.body);
    res.json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [신규] 일정 추가 요청 처리
exports.addSchedule = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) throw new Error('날짜(date)는 필수입니다.');
    
    const result = await unitService.addScheduleToUnit(req.params.id, date);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [신규] 일정 삭제 요청 처리
exports.removeSchedule = async (req, res) => {
  try {
    await unitService.removeScheduleFromUnit(req.params.scheduleId);
    res.json({ message: '일정이 삭제되었습니다.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [변경] 부대 삭제 요청 처리
exports.deleteUnit = async (req, res) => {
  try {
    await unitService.removeUnitPermanently(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
