"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../../config/logger"));
const prismaErrorMapper_1 = require("../errors/prismaErrorMapper");
const AppError_1 = __importDefault(require("../errors/AppError"));
const defaultCodeByStatus = (statusCode) => {
    const statusMap = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'RATE_LIMITED',
        500: 'INTERNAL_ERROR',
    };
    return statusMap[statusCode] || 'INTERNAL_ERROR';
};
function normalizeError(err) {
    if (err instanceof AppError_1.default) {
        const statusCode = Number(err.statusCode || 500);
        return {
            statusCode,
            code: err.code || defaultCodeByStatus(statusCode),
            message: err.message,
            stack: err.stack,
            meta: err.meta,
            isAppError: true,
        };
    }
    // 누군가 `throw "boom"` 같은 걸 해도 안전하게
    if (err instanceof Error) {
        return {
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: err.message || 'Internal Server Error',
            stack: err.stack,
            isAppError: false,
        };
    }
    return {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        isAppError: false,
    };
}
const errorHandler = (err, req, res, next) => {
    const mapped = (0, prismaErrorMapper_1.mapPrismaError)(err);
    const normalized = normalizeError(mapped ?? err);
    const isProd = process.env.NODE_ENV === 'production';
    const safeMessage = isProd && !normalized.isAppError ? 'Internal Server Error' : normalized.message;
    const logPayload = {
        code: normalized.code,
        statusCode: normalized.statusCode,
        message: normalized.message,
        userId: req.user?.id ?? null,
        method: req.method,
        url: req.originalUrl || req.url,
        meta: normalized.meta ?? null,
        ...(normalized.statusCode >= 500 ? { stack: normalized.stack } : {}),
    };
    if (normalized.statusCode >= 500)
        logger_1.default.error('[API ERROR]', logPayload);
    else
        logger_1.default.warn('[API ERROR]', logPayload);
    res.status(normalized.statusCode).json({
        error: safeMessage,
        code: normalized.code,
        statusCode: normalized.statusCode
    });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
