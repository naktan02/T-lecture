"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requireSuperAdmin = requireSuperAdmin;
const AppError_1 = __importDefault(require("../errors/AppError"));
/**
 * 관리자(일반 + 슈퍼) 권한 체크
 */
function requireAdmin(req, res, next) {
    const user = req.user; // 전역 선언 덕분에 타입이 잡힙니다.
    if (!user || !user.isAdmin) {
        return next(new AppError_1.default('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
    }
    next();
}
/**
 * 슈퍼 관리자 전용 권한 체크
 */
function requireSuperAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.adminLevel !== 'SUPER') {
        return next(new AppError_1.default('슈퍼 관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
    }
    next();
}
