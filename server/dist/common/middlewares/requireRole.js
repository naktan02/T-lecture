"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const AppError_1 = __importDefault(require("../errors/AppError"));
/**
 * 역할별 접근 제한 미들웨어
 */
function requireRole(requiredRole) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return next(new AppError_1.default('인증이 필요합니다.', 401, 'UNAUTHORIZED'));
        }
        if (requiredRole === 'ADMIN') {
            if (!user.isAdmin) {
                return next(new AppError_1.default('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
            }
            return next();
        }
        if (requiredRole === 'INSTRUCTOR') {
            if (!user.isInstructor) {
                return next(new AppError_1.default('강사만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
            }
            return next();
        }
        // 기존 로직 유지: 기타 커스텀 역할 체크
        if (user.role !== requiredRole) {
            return next(new AppError_1.default('권한이 없습니다.', 403, 'FORBIDDEN'));
        }
        next();
    };
}
exports.default = requireRole;
