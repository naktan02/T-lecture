// server/src/domains/user/controllers/user.admin.controller.js
const adminService = require('../services/user.admin.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler');
const logger = require('../../../config/logger');
const AppError = require('../../../common/errors/AppError');

// ✅ :userId 파라미터를 안전하게 숫자로 변환 + 검증
function parseUserIdParam(req) {
  const raw = req.params?.userId;

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new AppError('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
  }

  const userId = Number(raw);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
  }

  return userId;
}

// ✅ 전체 사용자 조회
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers(req.query);
  res.json(users);
});

// ✅ 대기 사용자 조회
exports.getPendingUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getPendingUsers();
  res.json(users);
});

// ✅ 사용자 ID로 조회
exports.getUserById = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const user = await adminService.getUserById(userId);
  res.json(user);
});

// ✅ 사용자 ID로 수정
exports.updateUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const updatedUser = await adminService.updateUser(userId, req.body);

  logger.info('[admin.updateUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
    bodyKeys: Object.keys(req.body || {}),
  });

  res.json(updatedUser);
});

// ✅ 사용자 ID로 삭제
exports.deleteUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const result = await adminService.deleteUser(userId);

  logger.info('[admin.deleteUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 승인
exports.approveUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const result = await adminService.approveUser(userId);

  logger.info('[admin.approveUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 승인 (일괄)
exports.approveUsersBulk = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await adminService.approveUsersBulk(userIds);

  logger.info('[admin.approveUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

// ✅ 사용자 ID로 거부
exports.rejectUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const result = await adminService.rejectUser(userId);

  logger.info('[admin.rejectUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 거부 (일괄)
exports.rejectUsersBulk = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await adminService.rejectUsersBulk(userIds);

  logger.info('[admin.rejectUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

// ✅ 관리자 레벨 설정
exports.setAdminLevel = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const { level } = req.body;

  const result = await adminService.setAdminLevel(userId, level);

  logger.info('[admin.setAdminLevel]', {
    actorId: req.user?.id,
    targetUserId: userId,
    level: level,
  });

  res.json(result);
});

// ✅ 관리자 레벨 회수
exports.revokeAdminLevel = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); 
  const result = await adminService.revokeAdminLevel(userId);

  logger.info('[admin.revokeAdminLevel]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});
