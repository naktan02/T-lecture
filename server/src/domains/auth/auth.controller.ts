import { CookieOptions, Request, Response } from 'express';
import AppError from '../../common/errors/AppError';
import { asyncHandler } from '../../common/middlewares/asyncHandler';
import logger from '../../config/logger';
import authService from './auth.service';

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getRefreshCookieBaseOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    partitioned: isProd,
    path: '/',
  };
}

function getRefreshCookieOptions(rememberMe: boolean): CookieOptions {
  return rememberMe
    ? {
        ...getRefreshCookieBaseOptions(),
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      }
    : getRefreshCookieBaseOptions();
}

export const sendCode = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) throw new AppError('email이 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.sendVerificationCode(email);
  res.status(200).json(result);
});

export const verifyCode = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    throw new AppError('email, code가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.verifyCode(email, code);
  res.status(200).json(result);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, loginType, deviceId } = req.body || {};
  const rememberMe = req.body?.rememberMe !== false;

  if (!email || !password) {
    throw new AppError('email/password가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.login(email, password, deviceId, rememberMe);

  logger.debug('[auth.login]', {
    userId: result.user?.id ?? null,
    loginType: loginType ?? null,
    rememberMe,
  });

  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(result.rememberMe));

  res.status(200).json({
    accessToken: result.accessToken,
    user: result.user,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError('refreshToken이 없습니다.', 401, 'UNAUTHORIZED');

    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions(result.rememberMe));
    res.status(200).json({ accessToken: result.accessToken });
  } catch (err) {
    res.clearCookie('refreshToken', getRefreshCookieBaseOptions());
    throw err;
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.body || {};
  const userId = req.user?.id ?? null;

  logger.debug('[auth.logout]', { userId, hasDeviceId: Boolean(deviceId) });

  await authService.logout(userId, deviceId);
  res.clearCookie('refreshToken', getRefreshCookieBaseOptions());
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

export const sendPasswordResetCode = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) throw new AppError('email이 필요합니다.', 400, 'VALIDATION_ERROR');

  const result = await authService.sendPasswordResetCode(email);
  res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body || {};

  if (!email || !code || !newPassword) {
    throw new AppError('email, code, newPassword가 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const result = await authService.resetPassword(email, code, newPassword);
  res.status(200).json(result);
});
