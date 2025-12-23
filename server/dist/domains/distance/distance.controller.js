"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyBatchOnce = exports.getTodayUsage = exports.getInstructorsNearUnit = exports.calculateSpecificDistance = exports.getUnitsWithinDistance = exports.getDistance = void 0;
const distance_service_1 = __importDefault(require("./distance.service"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const logger_1 = __importDefault(require("../../config/logger"));
// 강사-부대 간 이미 계산된 거리 조회
exports.getDistance = (0, asyncHandler_1.default)(async (req, res) => {
    const instructorId = Number(req.params.instructorId);
    const unitId = Number(req.params.unitId);
    if (!Number.isFinite(instructorId) || !Number.isFinite(unitId)) {
        throw new AppError_1.default('instructorId/unitId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }
    const record = await distance_service_1.default.getDistance(instructorId, unitId);
    res.json(record);
});
// 특정 강사 기준으로 거리 범위 내 부대 리스트 조회
exports.getUnitsWithinDistance = (0, asyncHandler_1.default)(async (req, res) => {
    const instructorId = Number(req.params.instructorId);
    const min = Number(req.query.min ?? 0);
    const max = Number(req.query.max ?? 999999);
    if (!Number.isFinite(instructorId)) {
        throw new AppError_1.default('instructorId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
        throw new AppError_1.default('min/max 값이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
    }
    const units = await distance_service_1.default.getUnitsWithinDistance(instructorId, min, max);
    res.json(units);
});
// 특정 강사-부대 간 거리 계산 및 저장
exports.calculateSpecificDistance = (0, asyncHandler_1.default)(async (req, res) => {
    const { instructorId, unitId } = req.body;
    if (!instructorId || !unitId) {
        throw new AppError_1.default('instructorId와 unitId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const result = await distance_service_1.default.calculateAndSaveDistance(instructorId, unitId);
    res.json(result);
});
// 특정 부대 기준으로 거리 범위 내 강사 리스트 조회
exports.getInstructorsNearUnit = (0, asyncHandler_1.default)(async (req, res) => {
    const unitId = Number(req.params.unitId);
    const min = Number(req.query.min ?? 0);
    const max = Number(req.query.max ?? 999999);
    if (!Number.isFinite(unitId) || unitId <= 0) {
        throw new AppError_1.default('unitId는 유효한 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
        throw new AppError_1.default('min/max 값이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
    }
    const instructors = await distance_service_1.default.getInstructorsWithinDistance(unitId, min, max);
    res.json(instructors);
});
// 카카오 API 사용량(오늘) 조회
exports.getTodayUsage = (0, asyncHandler_1.default)(async (req, res) => {
    const usage = await distance_service_1.default.getTodayUsage();
    res.json(usage);
});
// 수동 배치 1회 실행 (관리자 버튼용)
exports.runDailyBatchOnce = (0, asyncHandler_1.default)(async (req, res) => {
    const limit = Number(req.body?.limit ?? 200);
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new AppError_1.default('limit는 양의 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }
    logger_1.default.info('[distance.batch.run]', {
        userId: req.user?.id ?? null,
        limit,
    });
    const result = await distance_service_1.default.calculateDistancesBySchedulePriority(limit);
    res.json(result);
});
// CommonJS 호환
module.exports = {
    getDistance: exports.getDistance,
    getUnitsWithinDistance: exports.getUnitsWithinDistance,
    calculateSpecificDistance: exports.calculateSpecificDistance,
    getInstructorsNearUnit: exports.getInstructorsNearUnit,
    getTodayUsage: exports.getTodayUsage,
    runDailyBatchOnce: exports.runDailyBatchOnce,
};
