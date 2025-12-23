"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAdminLevel = exports.setAdminLevel = exports.rejectUsersBulk = exports.rejectUser = exports.approveUsersBulk = exports.approveUser = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getPendingUsers = exports.getUsers = void 0;
const user_admin_service_1 = __importDefault(require("../services/user.admin.service"));
const asyncHandler_1 = require("../../../common/middlewares/asyncHandler");
const logger_1 = __importDefault(require("../../../config/logger"));
const AppError_1 = __importDefault(require("../../../common/errors/AppError"));
// Express Request는 이미 ../types/express.d.ts에서 확장되어 req.user가 있습니다.
// ✅ :userId 파라미터를 안전하게 숫자로 변환 + 검증
function parseUserIdParam(req) {
    const raw = req.params?.userId;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        throw new AppError_1.default('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
    }
    const userId = Number(raw);
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new AppError_1.default('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
    }
    return userId;
}
// ✅ 전체 사용자 조회
exports.getUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const users = await user_admin_service_1.default.getAllUsers(req.query);
    res.json(users);
});
// ✅ 대기 사용자 조회
exports.getPendingUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const users = await user_admin_service_1.default.getPendingUsers();
    res.json(users);
});
// ✅ 사용자 ID로 조회
exports.getUserById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const user = await user_admin_service_1.default.getUserById(userId);
    res.json(user);
});
// ✅ 사용자 ID로 수정
exports.updateUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const updatedUser = await user_admin_service_1.default.updateUser(userId, req.body);
    logger_1.default.info('[admin.updateUser]', {
        actorId: req.user?.id,
        targetUserId: userId,
        bodyKeys: Object.keys(req.body || {}),
    });
    res.json(updatedUser);
});
// ✅ 사용자 ID로 삭제
exports.deleteUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const result = await user_admin_service_1.default.deleteUser(userId);
    logger_1.default.info('[admin.deleteUser]', {
        actorId: req.user?.id,
        targetUserId: userId,
    });
    res.json(result);
});
// ✅ 사용자 ID로 승인
exports.approveUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const result = await user_admin_service_1.default.approveUser(userId);
    logger_1.default.info('[admin.approveUser]', {
        actorId: req.user?.id,
        targetUserId: userId,
    });
    res.json(result);
});
// ✅ 사용자 ID로 승인 (일괄)
exports.approveUsersBulk = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userIds } = req.body;
    const result = await user_admin_service_1.default.approveUsersBulk(userIds);
    logger_1.default.info('[admin.approveUsersBulk]', {
        actorId: req.user?.id,
        count: Array.isArray(userIds) ? userIds.length : 0,
    });
    res.json(result);
});
// ✅ 사용자 ID로 거부
exports.rejectUser = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const result = await user_admin_service_1.default.rejectUser(userId);
    logger_1.default.info('[admin.rejectUser]', {
        actorId: req.user?.id,
        targetUserId: userId,
    });
    res.json(result);
});
// ✅ 사용자 ID로 거부 (일괄)
exports.rejectUsersBulk = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userIds } = req.body;
    const result = await user_admin_service_1.default.rejectUsersBulk(userIds);
    logger_1.default.info('[admin.rejectUsersBulk]', {
        actorId: req.user?.id,
        count: Array.isArray(userIds) ? userIds.length : 0,
    });
    res.json(result);
});
// ✅ 관리자 레벨 설정
exports.setAdminLevel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const { level } = req.body;
    const result = await user_admin_service_1.default.setAdminLevel(userId, level);
    logger_1.default.info('[admin.setAdminLevel]', {
        actorId: req.user?.id,
        targetUserId: userId,
        level: level,
    });
    res.json(result);
});
// ✅ 관리자 레벨 회수
exports.revokeAdminLevel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = parseUserIdParam(req);
    const result = await user_admin_service_1.default.revokeAdminLevel(userId);
    logger_1.default.info('[admin.revokeAdminLevel]', {
        actorId: req.user?.id,
        targetUserId: userId,
    });
    res.json(result);
});
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = {
    getUsers: exports.getUsers,
    getPendingUsers: exports.getPendingUsers,
    getUserById: exports.getUserById,
    updateUser: exports.updateUser,
    deleteUser: exports.deleteUser,
    approveUser: exports.approveUser,
    approveUsersBulk: exports.approveUsersBulk,
    rejectUser: exports.rejectUser,
    rejectUsersBulk: exports.rejectUsersBulk,
    setAdminLevel: exports.setAdminLevel,
    revokeAdminLevel: exports.revokeAdminLevel,
};
