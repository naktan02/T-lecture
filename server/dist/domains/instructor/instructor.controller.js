"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPromotion = exports.updateVirtues = exports.getMyStats = exports.updateAvailability = exports.getAvailability = void 0;
const instructor_service_1 = __importDefault(require("./instructor.service"));
const asyncHandler_1 = __importDefault(require("../../common/middlewares/asyncHandler"));
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
// 근무 가능일 조회
exports.getAvailability = (0, asyncHandler_1.default)(async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month)
        throw new AppError_1.default('연도(year)와 월(month) 파라미터가 필요합니다.', 400, 'VALIDATION_ERROR');
    const result = await instructor_service_1.default.getAvailabilities(req.user.id, Number(year), Number(month));
    res.json(result);
});
// 근무 가능일 수정
exports.updateAvailability = (0, asyncHandler_1.default)(async (req, res) => {
    const { year, month, dates } = req.body;
    if (!year || !month || !Array.isArray(dates))
        throw new AppError_1.default('잘못된 요청 데이터입니다.', 400, 'VALIDATION_ERROR');
    const result = await instructor_service_1.default.updateAvailabilities(req.user.id, Number(year), Number(month), dates);
    res.json(result);
});
// 강사 통계 조회
exports.getMyStats = (0, asyncHandler_1.default)(async (req, res) => {
    const stats = await instructor_service_1.default.getInstructorStats(req.user.id);
    res.json(stats);
});
// 강의 가능 과목 수정
exports.updateVirtues = (0, asyncHandler_1.default)(async (req, res) => {
    const { virtueIds } = req.body; // ex: [1, 2]
    if (!Array.isArray(virtueIds))
        throw new AppError_1.default('virtueIds는 배열이어야 합니다.', 400, 'VALIDATION_ERROR');
    const result = await instructor_service_1.default.updateVirtues(req.user.id, virtueIds);
    res.json(result);
});
// 승급 신청
exports.requestPromotion = (0, asyncHandler_1.default)(async (req, res) => {
    const { desiredLevel } = req.body; // 예: 'Main' (주강사)
    if (!desiredLevel)
        throw new AppError_1.default('희망하는 승급 등급(desiredLevel)을 입력해주세요.', 400, 'VALIDATION_ERROR');
    const result = await instructor_service_1.default.requestPromotion(req.user.id, desiredLevel);
    res.json(result);
});
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = {
    getAvailability: exports.getAvailability,
    updateAvailability: exports.updateAvailability,
    getMyStats: exports.getMyStats,
    updateVirtues: exports.updateVirtues,
    requestPromotion: exports.requestPromotion,
};
