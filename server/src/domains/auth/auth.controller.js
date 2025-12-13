// server/src/domains/auth/auth.controller.js
const authService = require('./auth.service');
const asyncHandler = require('../../common/middlewares/asyncHandler');
const AppError = require('../../common/errors/AppError');
const logger = require('../../config/logger');

// 쿠키 옵션(설정/삭제 시 동일하게 맞추는 게 안전)
function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

// [인증번호 발송]
exports.sendCode = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new AppError('email이 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.sendVerificationCode(email);
  res.status(200).json(result);
});

// [인증번호 검증]
exports.verifyCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) throw new AppError('email, code가 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.verifyCode(email, code);
  res.status(200).json(result);
});

// [회원가입]
exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

// [로그인]
exports.login = asyncHandler(async (req, res) => {
  const { email, password, loginType, deviceId } = req.body || {};
  if (!email || !password) throw new AppError('email/password가 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.login(email, password, loginType, deviceId);

  // ✅ PII(email/deviceId) 직접 로깅 X
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

// [토큰 갱신] (실패 시 쿠키 삭제 필요)
exports.refresh = asyncHandler(async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError('refreshToken이 없습니다.', 401, 'UNAUTHORIZED');

    const result = await authService.refreshAccessToken(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    res.clearCookie('refreshToken', getRefreshCookieOptions());
    next(err);
  }
});

// [로그아웃]
exports.logout = asyncHandler(async (req, res) => {
  const { deviceId } = req.body || {};
  const userId = req.user?.id ?? null;

  logger.info('[auth.logout]', { userId, hasDeviceId: Boolean(deviceId) });

  await authService.logout(userId, deviceId);
  res.clearCookie('refreshToken', getRefreshCookieOptions());
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

// [비밀번호 재설정]
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    throw new AppError('email, code, newPassword가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.resetPassword(email, code, newPassword);
  res.status(200).json(result);
});
