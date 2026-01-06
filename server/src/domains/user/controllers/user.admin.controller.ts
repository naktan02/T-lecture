// server/src/domains/user/controllers/user.admin.controller.ts
import { Request, Response } from 'express';
import adminService from '../services/user.admin.service';
import { asyncHandler } from '../../../common/middlewares/asyncHandler';
import logger from '../../../config/logger';
import AppError from '../../../common/errors/AppError';

// Express Request는 이미 ../types/express.d.ts에서 확장되어 req.user가 있습니다.

// ✅ :userId 파라미터를 안전하게 숫자로 변환 + 검증
function parseUserIdParam(req: Request): number {
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

// ✅ 전체 사용자 조회 (페이지네이션 지원)
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    name,
    role,
    page,
    limit,
    teamId,
    category,
    availableFrom,
    availableTo,
    profileIncomplete,
    sortField,
    sortOrder,
  } = req.query;
  const result = await adminService.getAllUsers({
    status: typeof status === 'string' ? status : undefined,
    name: typeof name === 'string' ? name : undefined,
    role: typeof role === 'string' ? role : undefined,
    teamId: typeof teamId === 'string' ? teamId : undefined,
    category: typeof category === 'string' ? category : undefined,
    availableFrom: typeof availableFrom === 'string' ? availableFrom : undefined,
    availableTo: typeof availableTo === 'string' ? availableTo : undefined,
    profileIncomplete: typeof profileIncomplete === 'string' ? profileIncomplete : undefined,
    page: typeof page === 'string' ? page : undefined,
    limit: typeof limit === 'string' ? limit : undefined,
    sortField: typeof sortField === 'string' ? sortField : undefined,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
  });
  res.json(result);
});

// ✅ 대기 사용자 조회
export const getPendingUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await adminService.getPendingUsers();
  res.json(users);
});

// ✅ 사용자 ID로 조회
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const user = await adminService.getUserById(userId);
  res.json(user);
});

// ✅ 사용자 ID로 수정
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const updatedUser = await adminService.updateUser(userId, req.body);

  logger.info('[admin.updateUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
    bodyKeys: Object.keys(req.body || {}),
  });

  res.json(updatedUser);
});

// ✅ 사용자 주소 전용 수정 (좌표 재계산 포함)
export const updateUserAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const { address } = req.body;

  // 주소만 업데이트 (service에서 좌표 재계산 처리)
  const updatedUser = await adminService.updateUser(userId, { address });

  logger.info('[admin.updateUserAddress]', {
    actorId: req.user?.id,
    targetUserId: userId,
    address,
  });

  res.json(updatedUser);
});

// ✅ 사용자 ID로 삭제
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.deleteUser(userId);

  logger.info('[admin.deleteUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 승인
export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.approveUser(userId);

  logger.info('[admin.approveUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 승인 (일괄)
export const approveUsersBulk = asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;
  const result = await adminService.approveUsersBulk(userIds);

  logger.info('[admin.approveUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

// ✅ 사용자 ID로 거부
export const rejectUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.rejectUser(userId);

  logger.info('[admin.rejectUser]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 사용자 ID로 거부 (일괄)
export const rejectUsersBulk = asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;
  const result = await adminService.rejectUsersBulk(userIds);

  logger.info('[admin.rejectUsersBulk]', {
    actorId: req.user?.id,
    count: Array.isArray(userIds) ? userIds.length : 0,
  });

  res.json(result);
});

// ✅ 관리자 레벨 설정
export const setAdminLevel = asyncHandler(async (req: Request, res: Response) => {
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
export const revokeAdminLevel = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.revokeAdminLevel(userId);

  logger.info('[admin.revokeAdminLevel]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 강사 역할 부여
export const grantInstructorRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.grantInstructorRole(userId);

  logger.info('[admin.grantInstructorRole]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// ✅ 강사 역할 회수
export const revokeInstructorRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = parseUserIdParam(req);
  const result = await adminService.revokeInstructorRole(userId);

  logger.info('[admin.revokeInstructorRole]', {
    actorId: req.user?.id,
    targetUserId: userId,
  });

  res.json(result);
});

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = {
  getUsers,
  getPendingUsers,
  getUserById,
  updateUser,
  updateUserAddress,
  deleteUser,
  approveUser,
  approveUsersBulk,
  rejectUser,
  rejectUsersBulk,
  setAdminLevel,
  revokeAdminLevel,
  grantInstructorRole,
  revokeInstructorRole,
};
