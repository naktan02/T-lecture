// server/src/domains/user/routes/user.admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/user.admin.controller');
const { auth } = require('../../../common/middlewares');
const { requireAdmin, requireSuperAdmin } = require('../../../common/middlewares/admin.middleware');

// 회원 관리 (조회, 수정, 삭제)  → 일반+슈퍼 공통
router.get('/users', auth, requireAdmin, adminController.getUsers);
router.get('/users/pending', auth, requireAdmin, adminController.getPendingUsers);
router.get('/users/:id', auth, requireAdmin, adminController.getUserById);
router.patch('/users/:id', auth, requireAdmin, adminController.updateUser);
router.delete('/users/:id', auth, requireAdmin, adminController.deleteUser);

//가입 승인/거절 워크플로우  → 일반+슈퍼 공통
router.patch('/users/bulk-approve', auth, requireAdmin, adminController.approveUsersBulk);
router.patch('/users/:userId/approve', auth, requireAdmin, adminController.approveUser);
router.delete('/users/bulk-reject', auth, requireAdmin, adminController.rejectUsersBulk);
router.delete('/users/:userId/reject', auth, requireAdmin, adminController.rejectUser);

// [슈퍼 전용] 관리자 권한 부여/회수 (추가)
// PATCH /api/v1/admin/users/:userId/admin { level: "GENERAL" | "SUPER" }
router.patch(
    '/users/:userId/admin',
    auth,
    requireSuperAdmin,
    adminController.setAdminLevel
);

// DELETE /api/v1/admin/users/:userId/admin
router.delete(
    '/users/:userId/admin',
    auth,
    requireSuperAdmin,
    adminController.revokeAdminLevel
);

module.exports = router;