// server/src/api/v1/distance.routes.js
const express = require('express');
const router = express.Router();

const distanceController = require('../controllers/distance.controller');
const { auth, requireRole } = require('../../../common/middlewares');

// ✅ (1) 강사-부대 간 이미 계산된 거리 조회
// GET /api/v1/distance/:instructorId/:unitId
router.get(
    '/:instructorId/:unitId',
    auth,
    requireRole('ADMIN'),          // 관리 화면에서만 본다고 가정
    distanceController.getDistance,
);

// ✅ (2) 특정 강사 기준, 거리 범위 안의 부대 리스트
// GET /api/v1/distance/instructor/:instructorId/within?min=0&max=50
router.get(
    '/instructor/:instructorId/within',
    auth,
    requireRole('ADMIN'),
    distanceController.getUnitsWithinDistance,
);

// ✅ (3) Kakao API 사용량 모니터링
// GET /api/v1/distance/usage/today
router.get(
    '/usage/today',
    auth,
    requireRole('ADMIN'),
    distanceController.getTodayUsage,
);

// (선택) 수동으로 일일 배치를 한 번 돌려보고 싶을 때만 쓰는 엔드포인트
// 실제 cron은 HTTP 안 거치고 service를 직접 호출하지만,
// UI에서 "한 번만 수동으로 돌리기" 버튼이 필요하면 추가.
router.post(
    '/batch/run',
    auth,
    requireRole('ADMIN'),
    distanceController.runDailyBatchOnce,
);

module.exports = router;
