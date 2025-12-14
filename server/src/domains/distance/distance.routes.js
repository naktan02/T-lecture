// src/domains/distance/distance.routes.js
const express = require('express');
const router = express.Router();

const distanceController = require('./distance.controller');
const { auth, requireRole } = require('../../common/middlewares');


// Kakao API 사용량 모니터링
router.get('/usage/today', auth, requireRole('ADMIN'), distanceController.getTodayUsage);

// 수동 배치 실행
router.post('/batch/run', auth, requireRole('ADMIN'), distanceController.runDailyBatchOnce);

// 특정 거리 수동 재계산
router.post('/calculate', auth, requireRole('ADMIN'), distanceController.calculateSpecificDistance);

// 특정 강사 기준, 거리 범위 안의 부대 리스트
router.get('/instructor/:instructorId/within', auth, requireRole('ADMIN'), distanceController.getUnitsWithinDistance);

// 특정 부대 기준 주변 강사 조회
router.get('/unit/:unitId/nearby-instructors', auth, requireRole('ADMIN'), distanceController.getInstructorsNearUnit);

// 강사-부대 간 이미 계산된 거리 조회
router.get('/:instructorId/:unitId', auth, requireRole('ADMIN'), distanceController.getDistance);

module.exports = router;