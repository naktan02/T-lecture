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
// server/src/domains/instructor/instructor.routes.ts
const express_1 = __importDefault(require("express"));
const instructorController = __importStar(require("./instructor.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
// 근무 가능일 조회
router.get('/availability', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), instructorController.getAvailability);
// 근무 가능일 수정
router.put('/availability', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), instructorController.updateAvailability);
// 내 통계 조회
router.get('/stats', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), instructorController.getMyStats);
// 강의 가능 과목 수정
router.put('/virtues', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), instructorController.updateVirtues);
// 승급 신청
router.post('/promotion', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), instructorController.requestPromotion);
exports.default = router;
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = router;
