"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUnit = exports.removeSchedule = exports.addSchedule = exports.updateOfficerInfo = exports.updateBasicInfo = exports.getUnitDetail = exports.uploadExcelAndRegisterUnits = exports.registerSingleUnit = exports.getUnitList = void 0;
const unit_service_1 = __importDefault(require("./unit.service"));
// @ts-ignore - JS 파일
const excel_service_1 = __importDefault(require("../../infra/excel.service"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
// 부대 목록 조회
exports.getUnitList = (0, asyncHandler_1.default)(async (req, res) => {
    const data = await unit_service_1.default.searchUnitList(req.query);
    res.status(200).json({
        result: 'Success',
        data: data,
    });
});
// 단건 부대 등록
exports.registerSingleUnit = (0, asyncHandler_1.default)(async (req, res) => {
    const unit = await unit_service_1.default.registerSingleUnit(req.body);
    res.status(201).json({
        result: 'Success',
        data: unit,
    });
});
// 엑셀 파일 업로드 및 부대 일괄 등록
exports.uploadExcelAndRegisterUnits = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.file) {
        throw new AppError_1.default('파일이 업로드되지 않았습니다.', 400, 'VALIDATION_ERROR');
    }
    const rawRows = excel_service_1.default.bufferToJson(req.file.buffer);
    const result = await unit_service_1.default.processExcelDataAndRegisterUnits(rawRows);
    res.status(201).json({
        result: 'Success',
        message: `${result.count}개 부대 정보가 성공적으로 등록되었습니다.`,
        data: result,
    });
});
// 부대 상세 정보 조회
exports.getUnitDetail = (0, asyncHandler_1.default)(async (req, res) => {
    const unit = await unit_service_1.default.getUnitDetailWithSchedules(req.params.id);
    res.status(200).json({
        result: 'Success',
        data: unit,
    });
});
// 부대 기본 정보 수정
exports.updateBasicInfo = (0, asyncHandler_1.default)(async (req, res) => {
    const unit = await unit_service_1.default.modifyUnitBasicInfo(req.params.id, req.body);
    res.status(200).json({
        result: 'Success',
        data: unit,
    });
});
// 부대 담당자 정보 수정
exports.updateOfficerInfo = (0, asyncHandler_1.default)(async (req, res) => {
    const unit = await unit_service_1.default.modifyUnitContactInfo(req.params.id, req.body);
    res.status(200).json({
        result: 'Success',
        data: unit,
    });
});
// 부대 일정 추가
exports.addSchedule = (0, asyncHandler_1.default)(async (req, res) => {
    const result = await unit_service_1.default.addScheduleToUnit(req.params.id, req.body.date);
    res.status(201).json({
        result: 'Success',
        data: result,
    });
});
// 부대 일정 삭제
exports.removeSchedule = (0, asyncHandler_1.default)(async (req, res) => {
    await unit_service_1.default.removeScheduleFromUnit(req.params.scheduleId);
    res.status(200).json({
        result: 'Success',
        message: '일정이 삭제되었습니다.',
    });
});
// 부대 삭제
exports.deleteUnit = (0, asyncHandler_1.default)(async (req, res) => {
    await unit_service_1.default.removeUnitPermanently(req.params.id);
    res.status(204).send();
});
// CommonJS 호환
module.exports = {
    getUnitList: exports.getUnitList,
    registerSingleUnit: exports.registerSingleUnit,
    uploadExcelAndRegisterUnits: exports.uploadExcelAndRegisterUnits,
    getUnitDetail: exports.getUnitDetail,
    updateBasicInfo: exports.updateBasicInfo,
    updateOfficerInfo: exports.updateOfficerInfo,
    addSchedule: exports.addSchedule,
    removeSchedule: exports.removeSchedule,
    deleteUnit: exports.deleteUnit,
};
