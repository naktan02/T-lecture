import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserStatus } from '../../generated/prisma/client.js';
import AppError from '../../common/errors/AppError';
import distanceService from '../distance/distance.service';
import { sendAuthCode } from '../../infra/email';
import instructorRepository from '../instructor/instructor.repository';
import userRepository from '../user/repositories/user.repository';
import authRepository from './auth.repository';
import { JwtPayload, RegisterDto } from '../../types/auth.types';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = '$2b$10$sgrlGCi/OCnQGgwZ/X9pXuvOyk2vhDC9hNf/X0yPTLqrV8ahaijfO';

function createInvalidLoginError(): AppError {
  return new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', 401, 'INVALID_CREDENTIALS');
}

class AuthService {
  async sendVerificationCode(email: string) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    await authRepository.createVerificationCode(email, code, expiresAt);
    await sendAuthCode(email, code);

    return { message: '인증번호가 발송되었습니다. (유효시간 3분)' };
  }

  async sendPasswordResetCode(email: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return { message: '입력한 이메일로 계정이 존재하면 인증번호가 발송됩니다. (유효시간 3분)' };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    await authRepository.createVerificationCode(email, code, expiresAt);
    await sendAuthCode(email, code);

    return { message: '입력한 이메일로 계정이 존재하면 인증번호가 발송됩니다. (유효시간 3분)' };
  }

  async verifyCode(email: string, code: string) {
    const record = await authRepository.findLatestVerification(email);

    if (!record) {
      throw new AppError('인증 요청 기록이 없습니다.', 404, 'VERIFICATION_NOT_FOUND');
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('인증번호가 만료되었습니다.', 400, 'VERIFICATION_EXPIRED');
    }

    if (record.code !== code) {
      throw new AppError('인증번호가 일치하지 않습니다.', 400, 'VERIFICATION_FAILED');
    }

    await authRepository.markAsVerified(record.id);

    return { message: '이메일 인증이 완료되었습니다.' };
  }

  async register(dto: RegisterDto) {
    const {
      email,
      password,
      name,
      phoneNumber,
      address,
      addressDetail,
      type,
      virtueIds,
      teamId,
      category,
    } = dto;

    if (!email || !password || !name || !phoneNumber) {
      throw new AppError('필수 정보가 누락되었습니다.', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('이미 가입한 이메일입니다.', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const verification = await authRepository.findLatestVerification(email);
    if (!verification || !verification.isVerified) {
      throw new AppError('이메일 인증이 완료되지 않았습니다.', 400, 'EMAIL_NOT_VERIFIED');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const commonData = {
      userEmail: email,
      password: hashedPassword,
      name,
      userphoneNumber: phoneNumber,
      status: UserStatus.PENDING,
    };

    let newUser;

    if (type === 'INSTRUCTOR') {
      if (!address) {
        throw new AppError('강사는 거주지 주소를 입력해야 합니다.', 400, 'VALIDATION_ERROR');
      }

      if (!category || !virtueIds || virtueIds.length === 0) {
        throw new AppError(
          '강사 과목(덕목), 직책 정보를 입력해야 합니다.',
          400,
          'VALIDATION_ERROR',
        );
      }

      const isProfileComplete = Boolean(address && category);

      newUser = await userRepository.createInstructor(commonData, {
        location: address,
        locationDetail: addressDetail || null,
        ...(teamId ? { team: { connect: { id: teamId } } } : {}),
        category: category || null,
        lat: null,
        lng: null,
        profileCompleted: isProfileComplete,
      });

      await instructorRepository.addVirtues(newUser.id, virtueIds);
      await distanceService.createDistanceRowsForNewInstructor(newUser.id);
    } else {
      newUser = await userRepository.createUser(commonData);
    }

    await authRepository.deleteVerifications(email);

    return {
      id: newUser.id,
      email: newUser.userEmail,
      name: newUser.name,
      status: newUser.status,
      message: '가입 요청이 완료되었습니다. 관리자 확인 후 이용 가능합니다.',
    };
  }

  async login(email: string, password: string, deviceId: string | null, rememberMe = true) {
    const user = await userRepository.findByEmail(email);
    const passwordHash = user?.password || DUMMY_PASSWORD_HASH;
    const ok = await bcrypt.compare(password, passwordHash);

    if (!user || !ok || user.status !== 'APPROVED') {
      throw createInvalidLoginError();
    }

    const { accessSecret, refreshSecret } = this.getJwtSecrets();
    const normalizedRememberMe = rememberMe !== false;
    const refreshPayload: JwtPayload = {
      userId: user.id,
      rememberMe: normalizedRememberMe,
    };

    const accessToken = jwt.sign({ userId: user.id }, accessSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(refreshPayload, refreshSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    const tokenHash = this.hashToken(refreshToken);
    await authRepository.saveRefreshToken(user.id, tokenHash, expiresAt, deviceId);

    const isInstructor = Boolean(user.instructor);
    const isAdmin = Boolean(user.admin);

    return {
      accessToken,
      refreshToken,
      rememberMe: normalizedRememberMe,
      user: {
        id: user.id,
        email: user.userEmail,
        name: user.name,
        status: user.status,
        isAdmin,
        adminLevel: user.admin?.level || null,
        isInstructor,
        instructorProfileCompleted: isInstructor ? user.instructor?.profileCompleted : null,
      },
    };
  }

  async refreshAccessToken(incomingRefreshToken: string) {
    if (!incomingRefreshToken) {
      throw new AppError('리프레시 토큰이 없습니다.', 401, 'TOKEN_MISSING');
    }

    const { accessSecret, refreshSecret } = this.getJwtSecrets();

    let payload: JwtPayload;
    try {
      payload = jwt.verify(incomingRefreshToken, refreshSecret) as JwtPayload;
    } catch {
      throw new AppError('리프레시 토큰이 만료되었거나 유효하지 않습니다.', 401, 'TOKEN_INVALID');
    }

    const incomingTokenHash = this.hashToken(incomingRefreshToken);
    const dbToken = await authRepository.findRefreshToken(incomingTokenHash);

    if (!dbToken) {
      throw new AppError(
        '유효하지 않은 리프레시 토큰입니다. (재로그인 필요)',
        401,
        'TOKEN_NOT_FOUND',
      );
    }

    const rememberMe = payload.rememberMe !== false;
    const deviceId = dbToken.deviceId;

    await authRepository.deleteByTokenHash(incomingTokenHash);

    const accessToken = jwt.sign({ userId: payload.userId }, accessSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = jwt.sign({ userId: payload.userId, rememberMe }, refreshSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    const newTokenHash = this.hashToken(refreshToken);
    await authRepository.saveRefreshToken(payload.userId, newTokenHash, expiresAt, deviceId);

    return {
      accessToken,
      refreshToken,
      rememberMe,
    };
  }

  async logout(userId: number | null, deviceId: string | null) {
    if (userId) {
      await authRepository.deleteRefreshToken(userId, deviceId);
    }

    return { message: '로그아웃 되었습니다.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const invalidResetError = () =>
      new AppError(
        '이메일 또는 인증번호가 올바르지 않거나 만료되었습니다.',
        400,
        'VERIFICATION_FAILED',
      );

    const user = await userRepository.findByEmail(email);
    if (!user) throw invalidResetError();

    const record = await authRepository.findLatestVerification(email);
    if (!record || record.code !== code) {
      throw invalidResetError();
    }

    if (new Date() > record.expiresAt) {
      throw invalidResetError();
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(user.id, hashedPassword);
    await authRepository.deleteVerifications(email);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  private getJwtSecrets() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new AppError('서버 설정 오류: 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
    }

    return { accessSecret, refreshSecret };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export default new AuthService();
