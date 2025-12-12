// server/src/domains/unit/unit.routes.js
const express = require('express');
const router = express.Router();

const unitController = require('./unit.controller');
const { auth, requireRole } = require('../../common/middlewares');

// 부대 관리는 관리자 전용
router.use(auth, requireRole('ADMIN'));

router.post('/', unitController.createUnit);
router.get('/', unitController.getUnits);
router.get('/:id', unitController.getUnit);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
