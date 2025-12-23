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
// server/src/domains/user/routes/user.admin.routes.ts
const express_1 = __importDefault(require("express"));
const adminController = __importStar(require("../controllers/user.admin.controller"));
const middlewares_1 = require("../../../common/middlewares");
const admin_middleware_1 = require("../../../common/middlewares/admin.middleware");
const router = express_1.default.Router();
// [일반 관리자 전용] 회원 관리
router.get('/users', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.getUsers);
// [일반 관리자 전용] 승인 대기 회원 조회
router.get('/users/pending', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.getPendingUsers);
// [일반 관리자 전용] 승인 대기 회원 일괄 승인
router.patch('/users/bulk-approve', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.approveUsersBulk);
// [일반 관리자 전용] 승인 대기 회원 일괄 거부
router.delete('/users/bulk-reject', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.rejectUsersBulk);
// [일반 관리자 전용] 승인 대기 회원 개별 승인
router.patch('/users/:userId/approve', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.approveUser);
// [일반 관리자 전용] 승인 대기 회원 개별 거부
router.delete('/users/:userId/reject', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.rejectUser);
// [일반 관리자 전용] 회원 정보 수정
router.patch('/users/:userId', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.updateUser);
// [일반 관리자 전용] 회원 삭제
router.delete('/users/:userId', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.deleteUser);
// [일반 관리자 전용] 회원 상세 조회
router.get('/users/:userId', middlewares_1.auth, admin_middleware_1.requireAdmin, adminController.getUserById);
// [슈퍼 관리자 전용] 관리자 권한 부여/회수
router.patch('/users/:userId/admin', middlewares_1.auth, admin_middleware_1.requireSuperAdmin, adminController.setAdminLevel);
// [슈퍼 관리자 전용] 관리자 권한 회수
router.delete('/users/:userId/admin', middlewares_1.auth, admin_middleware_1.requireSuperAdmin, adminController.revokeAdminLevel);
exports.default = router;
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = router;
