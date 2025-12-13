// server/src/domains/user/controllers/user.admin.controller.js
const adminService = require('../services/user.admin.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler');
const logger = require('../../../config/logger');
const AppError = require('../../../common/errors/AppError'); // ✅ 경로 확인 필요

// ✅ :userId 파라미터를 안전하게 숫자로 변환 + 검증
function parseUserIdParam(req) {
  const raw = req.params?.userId;

  // raw가 없거나 빈 문자열이면 바로 400
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new AppError('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
  }

  const userId = Number(raw);

  // NaN, 소수, 0/음수 방지
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('userId 파라미터가 올바르지 않습니다.', 400, 'INVALID_USER_ID');
  }

  return userId;
}

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers(req.query);
  res.json(users);
});

exports.getPendingUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getPendingUsers();
  res.json(users);
});

exports.getUserById = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const user = await adminService.getUserById(userId);
  res.json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const updatedUser = await adminService.updateUser(userId, req.body);

  logger.info('[admin.updateUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
    bodyKeys: Object.keys(req.body || {}),
  });

  res.json(updatedUser);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const result = await adminService.deleteUser(userId);

  logger.info('[admin.deleteUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

exports.approveUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const result = await adminService.approveUser(userId);

  logger.info('[admin.approveUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

exports.approveUsersBulk = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await adminService.approveUsersBulk(userIds);

  logger.info('[admin.approveUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

exports.rejectUser = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const result = await adminService.rejectUser(userId);

  logger.info('[admin.rejectUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

exports.rejectUsersBulk = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await adminService.rejectUsersBulk(userIds);

  logger.info('[admin.rejectUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

exports.setAdminLevel = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const { level } = req.body;

  const result = await adminService.setAdminLevel(userId, level);

  logger.info('[admin.setAdminLevel]', {
    actorId: req.user?.id,
    targetUserId: userId,
    level: level,
  });

  res.json(result);
});

exports.revokeAdminLevel = asyncHandler(async (req, res) => {
  const userId = parseUserIdParam(req); // ✅ 핵심
  const result = await adminService.revokeAdminLevel(userId);

  logger.info('[admin.revokeAdminLevel]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});
