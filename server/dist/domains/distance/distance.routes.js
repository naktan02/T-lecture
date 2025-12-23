"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/domains/distance/distance.routes.ts
const express_1 = __importDefault(require("express"));
const distanceController = __importStar(require("./distance.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
// Kakao API 사용량 모니터링
router.get('/usage/today', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.getTodayUsage);
// 수동 배치 실행
router.post('/batch/run', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.runDailyBatchOnce);
// 특정 거리 수동 재계산
router.post('/calculate', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.calculateSpecificDistance);
// 특정 강사 기준, 거리 범위 안의 부대 리스트
router.get('/instructor/:instructorId/within', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.getUnitsWithinDistance);
// 특정 부대 기준 주변 강사 조회
router.get('/unit/:unitId/nearby-instructors', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.getInstructorsNearUnit);
// 강사-부대 간 이미 계산된 거리 조회
router.get('/:instructorId/:unitId', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), distanceController.getDistance);
exports.default = router;
// CommonJS 호환
module.exports = router;
