// server/src/domains/auth/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserStatus } from '../../generated/prisma/client.js';

import instructorRepository from '../instructor/instructor.repository';
import authRepository from './auth.repository';
import userRepository from '../user/repositories/user.repository';
import { sendAuthCode } from '../../infra/email';
import distanceService from '../distance/distance.service';
import AppError from '../../common/errors/AppError';
import { RegisterDto, JwtPayload } from '../../types/auth.types';

const SALT_ROUNDS = 10;

class AuthService {
  // 이메일 인증 코드 생성/저장 후 이메일로 발송
  async sendVerificationCode(email: string) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분 유효

    await authRepository.createVerificationCode(email, code, expiresAt);
    await sendAuthCode(email, code);

    return { message: '인증번호가 발송되었습니다. (유효시간 3분)' };
  }

  // 비밀번호 재설정용 인증 코드 발송 (가입 여부 확인)
  async sendPasswordResetCode(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('가입되지 않은 이메일입니다.', 404, 'USER_NOT_FOUND');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분 유효

    await authRepository.createVerificationCode(email, code, expiresAt);
    await sendAuthCode(email, code);

    return { message: '인증번호가 발송되었습니다. (유효시간 3분)' };
  }

  // 인증번호 검증
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

  // 회원가입
  async register(dto: RegisterDto) {
    const { email, password, name, phoneNumber, address, type, virtueIds, teamId, category } = dto;

    if (!email || !password || !name || !phoneNumber) {
      throw new AppError('필수 정보가 누락되었습니다.', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('이미 가입된 이메일입니다.', 409, 'EMAIL_ALREADY_EXISTS');
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
      if (!address)
        throw new AppError('강사는 거주지 주소를 입력해야 합니다.', 400, 'VALIDATION_ERROR');
      if (!category || !virtueIds || virtueIds.length === 0) {
        throw new AppError(
          '강사 과목(덕목), 직책 정보를 입력해야 합니다.',
          400,
          'VALIDATION_ERROR',
        );
      }

      // 프로필 완성 조건: 주소, 분류, 기수가 모두 있어야 함 (팀은 선택)
      // 현재 가입 시에는 기수(generation)를 받지 않으므로 초기 상태는 미완료(false)가 됨
      const isProfileComplete = false;

      newUser = await userRepository.createInstructor(commonData, {
        location: address,
        ...(teamId ? { team: { connect: { id: teamId } } } : {}),
        category: category || null,
        lat: null, // 승인 시점에 변환
        lng: null,
        profileCompleted: isProfileComplete,
      });

      await instructorRepository.addVirtues(newUser.id, virtueIds);

      // 신규 강사에 대해 스케줄 있는 부대들과의 거리 행 생성
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
      message: '가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
    };
  }

  // 로그인
  async login(email: string, password: string, loginType: string, deviceId: string | null) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('가입되지 않은 이메일입니다.', 404, 'USER_NOT_FOUND');
    }

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      throw new AppError('비밀번호가 일치하지 않습니다.', 401, 'INVALID_PASSWORD');
    }

    if (user.status !== 'APPROVED') {
      throw new AppError('승인되지 않은 사용자입니다.', 403, 'USER_NOT_APPROVED');
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_SECRET || !REFRESH_SECRET) {
      throw new AppError('서버 설정 오류: 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
    }

    const payload = { userId: user.id };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 해시화하여 DB 저장
    const tokenHash = this.hashToken(refreshToken);
    await authRepository.saveRefreshToken(user.id, tokenHash, expiresAt, deviceId);

    const isInstructor = !!user.instructor;
    const isAdmin = !!user.admin;
    const adminLevel = user.admin?.level || null;
    const instructorProfileCompleted = isInstructor ? user.instructor?.profileCompleted : null;

    return {
      accessToken,
      refreshToken, // 클라이언트에게는 원본 전달
      user: {
        id: user.id,
        email: user.userEmail,
        name: user.name,
        status: user.status,
        isAdmin,
        adminLevel,
        isInstructor,
        instructorProfileCompleted,
      },
    };
  }

  // 리프레시 토큰 발급 (Rotation 적용)
  async refreshAccessToken(incomingRefreshToken: string) {
    if (!incomingRefreshToken)
      throw new AppError('리프레시 토큰이 없습니다.', 401, 'TOKEN_MISSING');

    const JWT_SECRET = process.env.JWT_SECRET;
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    if (!JWT_SECRET || !REFRESH_SECRET) {
      throw new AppError('서버 설정 오류: 토큰 시크릿이 없습니다.', 500, 'CONFIG_ERROR');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(incomingRefreshToken, REFRESH_SECRET) as JwtPayload;
    } catch (_e) {
      throw new AppError('리프레시 토큰이 만료되었거나 유효하지 않습니다.', 401, 'TOKEN_INVALID');
    }

    // DB에서 토큰 조회
    const incomingTokenHash = this.hashToken(incomingRefreshToken);
    const dbToken = await authRepository.findRefreshToken(incomingTokenHash);

    if (!dbToken) {
      throw new AppError(
        '유효하지 않은 리프레시 토큰입니다. (재로그인 필요)',
        401,
        'TOKEN_NOT_FOUND',
      );
    }
    const deviceId = dbToken.deviceId;

    // Rotation: 기존 토큰 삭제
    await authRepository.deleteByTokenHash(incomingTokenHash);

    // 4. 새로운 토큰 쌍 발급
    const newAccessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ userId: payload.userId }, REFRESH_SECRET, {
      expiresIn: '7d',
    });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 새로운 토큰 해시 저장
    const newTokenHash = this.hashToken(newRefreshToken);
    await authRepository.saveRefreshToken(payload.userId, newTokenHash, expiresAt, deviceId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // SHA256 해시 생성 헬퍼
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // 로그아웃
  async logout(userId: number | null, deviceId: string | null) {
    if (userId) {
      await authRepository.deleteRefreshToken(userId, deviceId);
    }
    return { message: '로그아웃 되었습니다.' };
  }

  // 비밀번호 재설정
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError('가입되지 않은 이메일입니다.', 404, 'USER_NOT_FOUND');

    const record = await authRepository.findLatestVerification(email);
    if (!record || record.code !== code) {
      throw new AppError('인증번호가 올바르지 않습니다.', 400, 'VERIFICATION_FAILED');
    }

    if (new Date() > record.expiresAt) {
      throw new AppError('인증번호가 만료되었습니다.', 400, 'VERIFICATION_EXPIRED');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(user.id, hashedPassword);
    await authRepository.deleteVerifications(email);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}

export default new AuthService();
