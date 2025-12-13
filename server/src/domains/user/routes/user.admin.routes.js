// server/src/domains/user/routes/user.admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/user.admin.controller');
const { auth } = require('../../../common/middlewares');
const { requireAdmin, requireSuperAdmin } = require('../../../common/middlewares/admin.middleware');

// 회원 관리 (조회, 수정, 삭제)  → 일반+슈퍼 공통
router.get('/users', auth, requireAdmin, adminController.getUsers);
router.get('/users/pending', auth, requireAdmin, adminController.getPendingUsers);
router.patch('/users/bulk-approve', auth, requireAdmin, adminController.approveUsersBulk);
router.delete('/users/bulk-reject', auth, requireAdmin, adminController.rejectUsersBulk);
router.patch('/users/:userId/approve', auth, requireAdmin, adminController.approveUser);
router.delete('/users/:userId/reject', auth, requireAdmin, adminController.rejectUser);
router.patch('/users/:userId', auth, requireAdmin, adminController.updateUser);
router.delete('/users/:userId', auth, requireAdmin, adminController.deleteUser);
router.get('/users/:userId', auth, requireAdmin, adminController.getUserById);


// [슈퍼 전용] 관리자 권한 부여/회수 (추가)
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