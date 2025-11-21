// domains/user/controllers/user.me.controller.js
const userMeService = require('../services/user.me.service');

// GET /users/me
exports.getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user.id; // checkAuth에서 심어줌 (JWT payload)
        const profile = await userMeService.getMyProfile(userId);
        res.json(profile);
    } catch (error) {
        next(error);
    }
};

// PATCH /users/me
exports.updateMyProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updated = await userMeService.updateMyProfile(userId, req.body);
        res.json(updated);
    } catch (error) {
        next(error);
    }
};
