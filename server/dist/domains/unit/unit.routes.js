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
// server/src/domains/unit/unit.routes.ts
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const unitController = __importStar(require("./unit.controller"));
const middlewares_1 = require("../../common/middlewares");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// 모든 부대 관련 API는 관리자(ADMIN) 권한 필요
router.use(middlewares_1.auth, (0, middlewares_1.requireRole)('ADMIN'));
// 부대 목록 조회
router.get('/', unitController.getUnitList);
// 부대 단건 등록
router.post('/', unitController.registerSingleUnit);
// 엑셀 파일 등록
router.post('/upload/excel', upload.single('file'), unitController.uploadExcelAndRegisterUnits);
// 부대 상세 조회
router.get('/:id', unitController.getUnitDetail);
// 부대 기본 정보 수정
router.patch('/:id/basic', unitController.updateBasicInfo);
// 부대 책임자 정보 수정
router.patch('/:id/officer', unitController.updateOfficerInfo);
// 부대 일정 추가
router.post('/:id/schedules', unitController.addSchedule);
// 부대 일정 삭제
router.delete('/:id/schedules/:scheduleId', unitController.removeSchedule);
// 부대 삭제
router.delete('/:id', unitController.deleteUnit);
exports.default = router;
// CommonJS 호환
module.exports = router;
