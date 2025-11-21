// server/src/api/v1/unit.routes.js
const express = require('express');
const router = express.Router();
// [수정 전] require('../../modules/unit/controllers/unit.controller');
const unitController = require('../../domains/unit/controllers/unit.controller');

const { checkAuth, checkAdmin } = require('../../common/middlewares/auth');

// [중요] 부대 관리는 '관리자'만 가능하도록 보안 적용
router.use(checkAuth);
router.use(checkAdmin);

// POST /api/v1/units (부대 생성)
router.post('/', unitController.createUnit);

// GET /api/v1/units (목록 조회)
router.get('/', unitController.getUnits);

// GET /api/v1/units/:id (상세 조회)
router.get('/:id', unitController.getUnit);

// PUT /api/v1/units/:id (수정)
router.put('/:id', unitController.updateUnit);

// DELETE /api/v1/units/:id (삭제)
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
