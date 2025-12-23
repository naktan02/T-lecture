"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
exports.default = exports.asyncHandler;
// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = exports.asyncHandler;
module.exports.asyncHandler = exports.asyncHandler;
