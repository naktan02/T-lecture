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
// src/domains/metadata/metadata.routes.ts
const express_1 = __importDefault(require("express"));
const metadataController = __importStar(require("./metadata.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
// 강사 가입용 메타데이터 (통합)
router.get('/instructor', metadataController.getInstructorMeta);
// 팀 목록 조회
router.get('/teams', metadataController.getTeams);
// 덕목 목록 조회
router.get('/virtues', metadataController.getVirtues);
// 메시지 템플릿 목록 조회 (관리자 전용 추천)
router.get('/templates', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), metadataController.getMessageTemplates);
// 팀 수정
router.put('/teams/:id', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), metadataController.updateTeam);
// 덕목 수정
router.put('/virtues/:id', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), metadataController.updateVirtue);
// 템플릿 수정
router.put('/templates/:key', middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'), metadataController.updateTemplate);
exports.default = router;
// CommonJS 호환
module.exports = router;
