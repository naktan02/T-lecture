// server/src/domains/auth/auth.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const instructorRepository = require('../instructor/instructor.repository');
const authRepository = require('./auth.repository');
const userRepository = require('../user/repositories/user.repository');
const emailService = require('../../infra/email.service');
const AppError = require('../../common/errors/AppError'); // ✅ 추가

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

class AuthService {
  /**
   * 1. 인증번호 발송
   */
  async sendVerificationCode(email) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분 유효

    await authRepository.createVerificationCode(email, code, expiresAt);
    await emailService.sendVerificationCode(email, code);

    return { message: '인증번호가 발송되었습니다. (유효시간 3분)' };
  }

  /**
   * 2. 인증번호 검증
   */
  async verifyCode(email, code) {
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

  /**
   * 3. 회원가입
   */
  async register(dto) {
    const {
      email, password, name, phoneNumber, address, type, virtueIds, teamId, category,
    } = dto;

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
      status: 'PENDING',
    };

    let newUser;

    if (type === 'INSTRUCTOR') {
      if (!address) throw new AppError('강사는 거주지 주소를 입력해야 합니다.', 400, 'VALIDATION_ERROR');
      if (!teamId || !category || !virtueIds || virtueIds.length === 0) {
        throw new AppError('강사 과목(덕목), 팀, 직책 정보를 모두 입력해야 합니다.', 400, 'VALIDATION_ERROR');
      }

      newUser = await userRepository.createInstructor(commonData, {
        location: address,
        teamId: teamId || null,
        category: category || null,
        lat: null,
        lng: null,
      });

      await instructorRepository.addVirtues(newUser.id, virtueIds);
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

  /**
   * 4. 로그인
   */
  async login(email, password, loginType, deviceId) {
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
    if (loginType === 'ADMIN' && user.role === 'USER') { // role 필드가 있는지 확인 필요 (User 모델 구조에 따라)
        // 기존 코드 유지하되, 필요시 admin 테이블 존재 여부로 체크 추천
    }

    const payload = { userId: user.id };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt, deviceId);

    const isInstructor = !!user.instructor;
    const isAdmin = !!user.admin;
    const adminLevel = user.admin?.level || null;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.userEmail,
        name: user.name,
        status: user.status,
        isAdmin,
        adminLevel,
        isInstructor,
      },
    };
  }

  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) throw new AppError('리프레시 토큰이 없습니다.', 401, 'TOKEN_MISSING');

    let payload;
    try {
      payload = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
    } catch (e) {
      throw new AppError('리프레시 토큰이 만료되었거나 유효하지 않습니다.', 401, 'TOKEN_INVALID');
    }

    const dbToken = await authRepository.findRefreshToken(payload.userId, incomingRefreshToken);
    if (!dbToken) {
      throw new AppError('유효하지 않은 리프레시 토큰입니다. (재로그인 필요)', 401, 'TOKEN_NOT_FOUND');
    }

    const newAccessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: '1h' });
    return { accessToken: newAccessToken };
  }

  async logout(userId, deviceId) {
    if (userId) {
        await authRepository.deleteRefreshToken(userId, deviceId);
    }
    return { message: '로그아웃 되었습니다.' };
  }

  async resetPassword(email, code, newPassword) {
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

module.exports = new AuthService();