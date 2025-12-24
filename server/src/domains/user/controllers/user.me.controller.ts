// server/src/domains/user/controllers/user.me.controller.ts
import { Request, Response } from 'express';
import userMeService from '../services/user.me.service';
import { asyncHandler } from '../../../common/middlewares/asyncHandler';
import logger from '../../../config/logger';

// Express Request는 이미 ../types/express.d.ts에서 확장되어 req.user가 있습니다.

// ✅ 내 프로필 조회
export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userMeService.getMyProfile(req.user!.id);
  res.json(profile);
});

// ✅ 내 프로필 수정
export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const updatedProfile = await userMeService.updateMyProfile(req.user!.id, req.body);

  logger.info('[user.updateMyProfile]', {
    userId: req.user!.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  res.json(updatedProfile);
});

// ✅ 회원 탈퇴
export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const result = await userMeService.withdraw(req.user!.id);

  logger.info('[user.withdraw]', {
    userId: req.user!.id,
  });

  res.json(result);
});

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = { getMyProfile, updateMyProfile, withdraw };
