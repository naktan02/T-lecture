// server/src/domains/user/controllers/user.me.controller.js
const userMeService = require('../services/user.me.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler');
const logger = require('../../../config/logger');

// ✅ 내 프로필 조회
exports.getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userMeService.getMyProfile(req.user.id);
  res.json(profile);
});

// ✅ 내 프로필 수정
exports.updateMyProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await userMeService.updateMyProfile(req.user.id, req.body);

  logger.info('[user.updateMyProfile]', {
    userId: req.user.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  res.json(updatedProfile);
});

// ✅ 회원 탈퇴
exports.withdraw = asyncHandler(async (req, res) => {
  const result = await userMeService.withdraw(req.user.id);

  logger.info('[user.withdraw]', {
    userId: req.user.id,
  });

  res.json(result);
});
