//server/src/api/v1/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/user.admin.controller');
const { auth, requireRole } = require('../../../common/middlewares');

// ==========================================
// 1. 회원 관리 (조회, 수정, 삭제)
// ==========================================

// 전체 유저 목록 조회 (검색/필터)
// GET /api/v1/admin/users
router.get('/users', auth, requireRole('ADMIN'), adminController.getUsers);

// 승인 대기 목록 조회
// GET /api/v1/admin/users/pending
router.get('/users/pending', auth, requireRole('ADMIN'), adminController.getPendingUsers);

// 특정 유저 상세 조회
// GET /api/v1/admin/users/:id
router.get('/users/:id', auth, requireRole('ADMIN'), adminController.getUserById);

// 유저 정보 수정
// PATCH /api/v1/admin/users/:id
router.patch('/users/:id', auth, requireRole('ADMIN'), adminController.updateUser);

// 유저 삭제
// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', auth, requireRole('ADMIN'), adminController.deleteUser);


// ==========================================
// 2. 가입 승인/거절 워크플로우
// ==========================================

// 일괄 승인
router.patch('/users/bulk-approve', auth, requireRole('ADMIN'), adminController.approveUsersBulk);

// 단일 승인
router.patch('/users/:userId/approve', auth, requireRole('ADMIN'), adminController.approveUser);

// 일괄 거절
router.delete('/users/bulk-reject', auth, requireRole('ADMIN'), adminController.rejectUsersBulk);

// 단일 거절
router.delete('/users/:userId/reject', auth, requireRole('ADMIN'), adminController.rejectUser);

module.exports = router;
