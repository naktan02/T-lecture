"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAssignmentByAdmin = exports.autoAssign = exports.getCandidates = exports.respondAssignment = exports.getAssignments = exports.getWorkHistory = void 0;
const assignment_service_1 = __importDefault(require("./assignment.service"));
const assignment_dto_1 = __importDefault(require("./assignment.dto"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const logger_1 = __importDefault(require("../../config/logger"));
// [근무 이력 조회] (Confirmed + Past)
exports.getWorkHistory = (0, asyncHandler_1.default)(async (req, res) => {
    const history = await assignment_service_1.default.getWorkHistory(req.user.id);
    res.json(history);
});
// [배정 목록 조회] (Active + Future)
exports.getAssignments = (0, asyncHandler_1.default)(async (req, res) => {
    const assignments = await assignment_service_1.default.getUpcomingAssignments(req.user.id);
    res.json(assignments);
});
// [임시 배정 응답] (수락/거절)
exports.respondAssignment = (0, asyncHandler_1.default)(async (req, res) => {
    const { unitScheduleId } = req.params;
    const { response } = req.body || {};
    if (!unitScheduleId || !response) {
        throw new AppError_1.default('필수 파라미터가 누락되었습니다.', 400, 'VALIDATION_ERROR');
    }
    logger_1.default.info('[assignment.respond]', {
        userId: req.user.id,
        unitScheduleId,
        response,
    });
    const result = await assignment_service_1.default.respondToAssignment(req.user.id, unitScheduleId, response);
    res.json(result);
});
// [배정 후보 데이터 조회] (부대 + 강사)
exports.getCandidates = (0, asyncHandler_1.default)(async (req, res) => {
    const { startDate, endDate } = req.query || {};
    if (!startDate || !endDate) {
        throw new AppError_1.default('조회 기간이 필요합니다. (startDate, endDate)', 400, 'VALIDATION_ERROR');
    }
    const { unitsRaw, instructorsRaw } = await assignment_service_1.default.getAssignmentCandidatesRaw(startDate, endDate);
    const responseData = assignment_dto_1.default.toCandidateResponse(unitsRaw, instructorsRaw);
    res.json(responseData);
});
//자동 배정 실행
exports.autoAssign = (0, asyncHandler_1.default)(async (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
        throw new AppError_1.default('기간(startDate, endDate)이 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        throw new AppError_1.default('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
    }
    logger_1.default.info('[assignment.autoAssign] Start', {
        userId: req.user.id,
        startDate,
        endDate,
    });
    const result = await assignment_service_1.default.createAutoAssignments(s, e);
    res.status(200).json(result);
});
// [배정 취소]
exports.cancelAssignmentByAdmin = (0, asyncHandler_1.default)(async (req, res) => {
    const unitScheduleId = Number(req.params.unitScheduleId);
    const instructorId = Number(req.body.instructorId);
    if (!Number.isFinite(unitScheduleId) || !Number.isFinite(instructorId)) {
        throw new AppError_1.default('unitScheduleId와 instructorId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const result = await assignment_service_1.default.cancelAssignment(req.user.id, req.user.role || 'ADMIN', instructorId, unitScheduleId);
    res.json(result);
});
// CommonJS 호환
module.exports = {
    getWorkHistory: exports.getWorkHistory,
    getAssignments: exports.getAssignments,
    respondAssignment: exports.respondAssignment,
    getCandidates: exports.getCandidates,
    autoAssign: exports.autoAssign,
    cancelAssignmentByAdmin: exports.cancelAssignmentByAdmin,
};
