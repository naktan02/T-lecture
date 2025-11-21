// domains/user/controllers/user.admin.controller.js
const adminUserService = require('../services/user.admin.service');

// GET /admin/users
exports.getUsers = async (req, res, next) => {
    try {
        const users = await adminUserService.getUsers(req.query);
        res.json(users);
    } catch (error) {
        next(error);
    }
};

// GET /admin/users/:id
exports.getUserById = async (req, res, next) => {
    try {
        const user = await adminUserService.getUserById(req.params.id);
        res.json(user);
    } catch (error) {
        next(error);
    }
};

// PATCH /admin/users/:id
exports.updateUser = async (req, res, next) => {
    try {
        const updated = await adminUserService.updateUser(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// DELETE /admin/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        await adminUserService.deleteUser(req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
