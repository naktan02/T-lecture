"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdraw = exports.updateMyProfile = exports.getMyProfile = void 0;
const user_me_service_1 = __importDefault(require("../services/user.me.service"));
const asyncHandler_1 = require("../../../common/middlewares/asyncHandler");
const logger_1 = __importDefault(require("../../../config/logger"));
// Express Request는 이미 ../types/express.d.ts에서 확장되어 req.user가 있습니다.
// ✅ 내 프로필 조회
exports.getMyProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const profile = await user_me_service_1.default.getMyProfile(req.user.id);
    res.json(profile);
});
// ✅ 내 프로필 수정
exports.updateMyProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const updatedProfile = await user_me_service_1.default.updateMyProfile(req.user.id, req.body);
    logger_1.default.info('[user.updateMyProfile]', {
        userId: req.user.id,
        bodyKeys: Object.keys(req.body || {}),
    });
    res.json(updatedProfile);
});
// ✅ 회원 탈퇴
exports.withdraw = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await user_me_service_1.default.withdraw(req.user.id);
    logger_1.default.info('[user.withdraw]', {
        userId: req.user.id,
    });
    res.json(result);
});
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = { getMyProfile: exports.getMyProfile, updateMyProfile: exports.updateMyProfile, withdraw: exports.withdraw };
