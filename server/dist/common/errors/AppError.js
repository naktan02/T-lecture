"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
// server/src/common/errors/AppError.ts
class AppError extends Error {
    statusCode;
    code;
    meta;
    isAppError;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', meta = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.meta = meta;
        this.isAppError = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
exports.default = AppError;
