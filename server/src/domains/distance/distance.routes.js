// server/src/api/v1/distance.routes.js
const express = require('express');
// [수정 전] require('../../modules/distance/controllers/distance.controller');
const distanceController = require('../../domains/distance/controllers/distance.controller');
const router = express.Router();

router.post('/calculate', distanceController.calculateDistance);

// 일일 배치 – 부대 일정 기준 거리 계산
router.get('/batch/daily', distanceController.calculateDailyDistances);

router.get('/:instructorId/:unitId', distanceController.getDistance);

router.get('/instructor/:instructorId/within', distanceController.getUnitsWithinDistance);

module.exports = router;
