// server/src/domains/auth/auth.controller.js
const authService = require('./auth.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');
const logger = require('../../config/logger');

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

exports.sendCode = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new AppError('email이 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.sendVerificationCode(email);
  res.status(200).json(result);
});

exports.verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) throw new AppError('email, code가 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.verifyCode(email, code);
  res.status(200).json(result);
});

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, loginType, deviceId } = req.body || {};
  if (!email || !password) throw new AppError('email/password가 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.login(email, password, loginType, deviceId);

  logger.info('[auth.login]', {
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

exports.refresh = asyncHandler(async (req, res) => {
    // asyncHandler가 에러를 잡으므로 try-catch 불필요하지만, 
    // 쿠키 삭제 로직을 위해 catch 유지 또는 에러 핸들러 위임 고려
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) throw new AppError('refreshToken이 없습니다.', 401, 'UNAUTHORIZED');

        const result = await authService.refreshAccessToken(refreshToken);
        res.status(200).json(result);
    } catch (err) {
        // 실패 시 쿠키 삭제 후 에러 던지기
        res.clearCookie('refreshToken', getRefreshCookieOptions());
        throw err;
    }
});

exports.logout = asyncHandler(async (req, res) => {
  const { deviceId } = req.body || {};
  const userId = req.user?.id ?? null;

  logger.info('[auth.logout]', { userId, hasDeviceId: Boolean(deviceId) });

  await authService.logout(userId, deviceId);
  res.clearCookie('refreshToken', getRefreshCookieOptions());
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    throw new AppError('email, code, newPassword가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.resetPassword(email, code, newPassword);
  res.status(200).json(result);
});