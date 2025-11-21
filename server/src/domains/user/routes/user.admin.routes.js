// domains/user/routes/user.admin.routes.js
const express = require('express');
const router = express.Router();

const auth = require('../../../common/middlewares/auth');
const requireRole = require('../../../common/middlewares/requireRole');
const controller = require('../controllers/user.admin.controller');

// 이 아래로는 전부 관리자 전용
router.use(auth, requireRole('ADMIN'));

// ✅ 전체 유저 조회 (검색/필터는 나중에 query로 확장)
router.get('/', controller.getUsers);

// ✅ 특정 유저 상세 조회
router.get('/:id', controller.getUserById);

// ✅ 유저 정보 수정 (이름/전화/role/status 등)
router.patch('/:id', controller.updateUser);

// ✅ 유저 삭제 (필요하다면 사용)
router.delete('/:id', controller.deleteUser);

// 나중에 승인/반려/role변경 등을 따로 두고 싶으면 이런 식으로 추가
// router.patch('/:id/approve', controller.approveUser);
// router.patch('/:id/role', controller.changeUserRole);

module.exports = router;
