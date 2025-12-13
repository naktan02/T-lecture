// server/src/domains/distance/distance.controller.js
const distanceService = require('./distance.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');
const logger = require('../../config/logger');

// ✅ (1) 강사-부대 간 이미 계산된 거리 조회
exports.getDistance = asyncHandler(async (req, res) => {
    const instructorId = Number(req.params.instructorId);
    const unitId = Number(req.params.unitId);

    if (!Number.isFinite(instructorId) || !Number.isFinite(unitId)) {
        throw new AppError('instructorId/unitId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }

    const record = await distanceService.getDistance(instructorId, unitId);
    res.json(record);
});

// ✅ (2) 특정 강사 기준으로 거리 범위 내 부대 리스트 조회
exports.getUnitsWithinDistance = asyncHandler(async (req, res) => {
    const instructorId = Number(req.params.instructorId);
    const min = Number(req.query.min ?? 0);
    const max = Number(req.query.max ?? 999999);

    if (!Number.isFinite(instructorId)) {
        throw new AppError('instructorId는 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0 || min > max) {
        throw new AppError('min/max 값이 올바르지 않습니다.', 400, 'VALIDATION_ERROR');
    }

    const units = await distanceService.getUnitsWithinDistance(instructorId, min, max);
    res.json(units);
});

exports.calculateSpecificDistance = asyncHandler(async (req, res) => {
    const { instructorId, unitId } = req.body;

    if (!instructorId || !unitId) {
        throw new AppError('instructorId와 unitId가 필요합니다.', 400, 'VALIDATION_ERROR');
    }

    // 서비스에 이미 구현된 calculateAndSaveDistance 호출
    const result = await distanceService.calculateAndSaveDistance(instructorId, unitId);
    res.json(result);
});

exports.getInstructorsNearUnit = asyncHandler(async (req, res) => {
    const unitId = Number(req.params.unitId);
    const min = Number(req.query.min ?? 0);
    const max = Number(req.query.max ?? 999999);

    const instructors = await distanceService.getInstructorsWithinDistance(unitId, min, max);
    res.json(instructors);
});



// ✅ (3) 카카오 API 사용량(오늘) 조회
exports.getTodayUsage = asyncHandler(async (req, res) => {
    const usage = await distanceService.getTodayUsage();
    res.json(usage);
});

// ✅ (4) 수동 배치 1회 실행 (관리자 버튼용)
exports.runDailyBatchOnce = asyncHandler(async (req, res) => {
    const limit = Number(req.body?.limit ?? 200);
    if (!Number.isFinite(limit) || limit <= 0) {
        throw new AppError('limit는 양의 숫자여야 합니다.', 400, 'VALIDATION_ERROR');
    }

    // ✅ 이벤트 로그만
    logger.info('[distance.batch.run]', {
        userId: req.user?.id ?? null,
        limit,
    });

    const result = await distanceService.calculateDistancesBySchedulePriority(limit);
    res.json(result);
});
