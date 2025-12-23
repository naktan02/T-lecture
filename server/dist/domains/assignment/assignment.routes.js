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
// src/domains/assignment/assignment.routes.ts
const express_1 = __importDefault(require("express"));
const assignmentController = __importStar(require("./assignment.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
// 강사: 내 배정 목록
router.get('/', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), assignmentController.getAssignments);
// 강사: 배정 응답
router.post('/:unitScheduleId/response', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), assignmentController.respondAssignment);
// 강사: 이력
router.get('/history', middlewares_1.auth, (0, middlewares_1.requireRole)('INSTRUCTOR'), assignmentController.getWorkHistory);
// 관리자: 후보
router.get('/candidates', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), assignmentController.getCandidates);
// 관리자: 자동배정 실행
router.post('/auto-assign', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), assignmentController.autoAssign);
// 관리자: 배정 취소
router.patch('/:unitScheduleId/cancel', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), assignmentController.cancelAssignmentByAdmin);
exports.default = router;
// CommonJS 호환
module.exports = router;
