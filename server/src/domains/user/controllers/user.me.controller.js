// web/server/src/domains/user/controllers/user.me.controller.js
const userMeService = require('../services/user.me.service');

// GET /api/v1/users/me
exports.getMyProfile = async (req, res) => {
  try {
    // req.user.id는 auth 미들웨어에서 제공 (JWT payload)
    const profile = await userMeService.getMyProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// PATCH /api/v1/users/me
exports.updateMyProfile = async (req, res) => {
  try {
    const updatedProfile = await userMeService.updateMyProfile(req.user.id, req.body);
    res.json(updatedProfile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /api/v1/users/me (회원 탈퇴)
exports.withdraw = async (req, res) => {
  try {
    const result = await userMeService.withdraw(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
