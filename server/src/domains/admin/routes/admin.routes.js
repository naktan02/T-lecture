const express = require('express');
const router = express.Router();

const adminController = require('../../domains/admin/controllers/admin.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 관리자 전용
router.use(auth, requireRole('ADMIN'));

// 승인 대기 목록 조회
router.get('/users/pending', adminController.getPendingUsers);

// 일괄 승인
router.patch('/users/bulk-approve', adminController.approveUsersBulk);

// 단일 승인
router.patch('/users/:userId/approve', adminController.approveUser);

// 내 정보 조회
router.get('/me', adminController.getMe);

// 일괄 거절
router.delete('/users/bulk-reject', adminController.rejectUsersBulk);

// 단일 거절
router.delete('/users/:userId/reject', adminController.rejectUser);

module.exports = router;
