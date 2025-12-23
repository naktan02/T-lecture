"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.logout = exports.refresh = exports.login = exports.register = exports.verifyCode = exports.sendCode = void 0;
const auth_service_1 = __importDefault(require("./auth.service"));
const asyncHandler_1 = require("../../common/middlewares/asyncHandler");
const AppError_1 = __importDefault(require("../../common/errors/AppError"));
const logger_1 = __importDefault(require("../../config/logger"));
// 쿠키 옵션
function getRefreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    };
}
// 이메일 인증 코드를 발송합니다.
exports.sendCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body || {};
    if (!email)
        throw new AppError_1.default('email이 필요합니다.', 400, 'VALIDATION_ERROR');
    const result = await auth_service_1.default.sendVerificationCode(email);
    res.status(200).json(result);
});
// 이메일 인증 코드를 검증합니다.
exports.verifyCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, code } = req.body || {};
    if (!email || !code)
        throw new AppError_1.default('email, code가 필요합니다.', 400, 'VALIDATION_ERROR');
    const result = await auth_service_1.default.verifyCode(email, code);
    res.status(200).json(result);
});
// 회원가입
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await auth_service_1.default.register(req.body);
    res.status(201).json(result);
});
// 로그인
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, loginType, deviceId } = req.body || {};
    if (!email || !password)
        throw new AppError_1.default('email/password가 필요합니다.', 400, 'VALIDATION_ERROR');
    const result = await auth_service_1.default.login(email, password, loginType, deviceId);
    logger_1.default.info('[auth.login]', {
        userId: result.user?.id ?? null,
        loginType: loginType ?? null,
    });
    res.cookie('refreshToken', result.refreshToken, {
        ...getRefreshCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
    });
});
// 토큰 재발급
exports.refresh = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken)
            throw new AppError_1.default('refreshToken이 없습니다.', 401, 'UNAUTHORIZED');
        const result = await auth_service_1.default.refreshAccessToken(refreshToken);
        res.status(200).json(result);
    }
    catch (err) {
        // 실패 시 쿠키 삭제 후 에러 던지기
        res.clearCookie('refreshToken', getRefreshCookieOptions());
        throw err;
    }
});
// 사용자 로그아웃 처리
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { deviceId } = req.body || {};
    const userId = req.user?.id ?? null;
    logger_1.default.info('[auth.logout]', { userId, hasDeviceId: Boolean(deviceId) });
    await auth_service_1.default.logout(userId, deviceId);
    res.clearCookie('refreshToken', getRefreshCookieOptions());
    res.status(200).json({ message: '로그아웃되었습니다.' });
});
// 사용자 비밀번호 재설정
exports.resetPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
        throw new AppError_1.default('email, code, newPassword가 필요합니다.', 400, 'VALIDATION_ERROR');
    }
    const result = await auth_service_1.default.resetPassword(email, code, newPassword);
    res.status(200).json(result);
});
