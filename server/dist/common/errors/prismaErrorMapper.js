"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPrismaError = mapPrismaError;
// server/src/common/errors/prismaErrorMapper.ts
const library_1 = require("@prisma/client/runtime/library");
const AppError_1 = __importDefault(require("./AppError"));
function mapPrismaError(err) {
    // 1. Known Request Error (P2002, P2025 등)
    if (err instanceof library_1.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': {
                const target = Array.isArray(err.meta?.target)
                    ? err.meta.target.join(',')
                    : String(err.meta?.target || 'field');
                return new AppError_1.default(`${target} 값이 이미 존재합니다.`, 409, 'DUPLICATE_RESOURCE', {
                    prismaCode: err.code,
                    target,
                    meta: err.meta,
                });
            }
            case 'P2025':
                return new AppError_1.default('요청하신 대상을 찾을 수 없습니다.', 404, 'NOT_FOUND', {
                    prismaCode: err.code,
                    meta: err.meta,
                });
            case 'P2003':
                return new AppError_1.default('참조 관계 제약으로 인해 처리할 수 없습니다.', 409, 'FOREIGN_KEY_CONFLICT', { prismaCode: err.code, meta: err.meta });
            default:
                return new AppError_1.default('데이터베이스 작업 중 오류가 발생했습니다.', 500, 'DB_ERROR', {
                    prismaCode: err.code,
                    meta: err.meta,
                });
        }
    }
    // 2. Validation Error
    if (err instanceof library_1.PrismaClientValidationError) {
        return new AppError_1.default('데이터 형식이 올바르지 않습니다.', 400, 'PRISMA_VALIDATION_ERROR');
    }
    // 3. Initialization Error
    if (err instanceof library_1.PrismaClientInitializationError) {
        return new AppError_1.default('데이터베이스 연결에 실패했습니다.', 503, 'DB_CONNECTION_ERROR');
    }
    return null;
}
