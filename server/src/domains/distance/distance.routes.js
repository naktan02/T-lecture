// src/domains/distance/distance.routes.js
const express = require('express');
const router = express.Router();

const distanceController = require('./distance.controller');
const { auth, requireRole } = require('../../common/middlewares');

// =================================================================
// 1. 고정 경로 (Static Routes) - 순서 중요: 가장 위에 배치
// =================================================================

// ✅ (3) Kakao API 사용량 모니터링
// GET /api/v1/distance/usage/today
router.get(
    '/usage/today',
    auth,
    requireRole('ADMIN'),
    distanceController.getTodayUsage,
);

// (선택) 수동 배치 실행
router.post(
    '/batch/run',
    auth,
    requireRole('ADMIN'),
    distanceController.runDailyBatchOnce,
);

// [신규] 2. 특정 거리 수동 재계산
router.post(
    '/calculate',
    auth,
    requireRole('ADMIN'),
    distanceController.calculateSpecificDistance
);

// =================================================================
// 2. 부분 동적 경로 (Semi-Dynamic Routes) - 중간 배치
// =================================================================

// ✅ (2) 특정 강사 기준, 거리 범위 안의 부대 리스트
router.get(
    '/instructor/:instructorId/within',
    auth,
    requireRole('ADMIN'),
    distanceController.getUnitsWithinDistance,
);

// [신규] 1. 특정 부대 기준 주변 강사 조회
router.get(
    '/unit/:unitId/nearby-instructors',
    auth,
    requireRole('ADMIN'),
    distanceController.getInstructorsNearUnit
);

// =================================================================
// 3. 완전 동적 경로 (Fully Dynamic Routes) - 마지막 배치
// =================================================================

// ✅ (1) 강사-부대 간 이미 계산된 거리 조회
// ⚠️ 주의: 이 코드가 맨 위에 있으면 '/usage/today' 같은 요청도 이 패턴으로 인식해버림
router.get(
    '/:instructorId/:unitId',
    auth,
    requireRole('ADMIN'),
    distanceController.getDistance,
);

module.exports = router;