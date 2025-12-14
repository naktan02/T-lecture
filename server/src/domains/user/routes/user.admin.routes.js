// server/src/domains/user/routes/user.admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/user.admin.controller');
const { auth } = require('../../../common/middlewares');
const { requireAdmin, requireSuperAdmin } = require('../../../common/middlewares/admin.middleware');

// [일반 관리자 전용] 회원 관리
router.get('/users', auth, requireAdmin, adminController.getUsers);

// [일반 관리자 전용] 승인 대기 회원 조회
router.get('/users/pending', auth, requireAdmin, adminController.getPendingUsers);

// [일반 관리자 전용] 승인 대기 회원 일괄 승인
router.patch('/users/bulk-approve', auth, requireAdmin, adminController.approveUsersBulk);

// [일반 관리자 전용] 승인 대기 회원 일괄 거부
router.delete('/users/bulk-reject', auth, requireAdmin, adminController.rejectUsersBulk);

// [일반 관리자 전용] 승인 대기 회원 개별 승인
router.patch('/users/:userId/approve', auth, requireAdmin, adminController.approveUser);

// [일반 관리자 전용] 승인 대기 회원 개별 거부
router.delete('/users/:userId/reject', auth, requireAdmin, adminController.rejectUser);

// [일반 관리자 전용] 회원 정보 수정
router.patch('/users/:userId', auth, requireAdmin, adminController.updateUser);

// [일반 관리자 전용] 회원 삭제
router.delete('/users/:userId', auth, requireAdmin, adminController.deleteUser);

// [일반 관리자 전용] 회원 상세 조회
router.get('/users/:userId', auth, requireAdmin, adminController.getUserById);

// [슈퍼 관리자 전용] 관리자 권한 부여/회수
router.patch('/users/:userId/admin', auth, requireSuperAdmin, adminController.setAdminLevel);

// [슈퍼 관리자 전용] 관리자 권한 회수
router.delete('/users/:userId/admin', auth, requireSuperAdmin, adminController.revokeAdminLevel);

module.exports = router;