// server/src/domains/auth/auth.service.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const instructorRepository = require('../instructor/instructor.repository');
const authRepository = require('./auth.repository');
const userRepository = require('../user/repositories/user.repository');
const emailService = require('../../infra/email.service');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';


class AuthService {
  /**
   * 1. 인증번호 발송
   */
  async sendVerificationCode(email) {
    // 6자리 난수 생성
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

    if (!record) throw new Error('인증 요청 기록이 없습니다.');
    if (new Date() > record.expiresAt) throw new Error('인증번호가 만료되었습니다.');
    if (record.code !== code) throw new Error('인증번호가 일치하지 않습니다.');

    await authRepository.markAsVerified(record.id);
    return { message: '이메일 인증이 완료되었습니다.' };
  }

  /**
   * 3. 회원가입
   * - 로직 수정: Admin 생성 불가, 오직 USER/INSTRUCTOR만 가입 가능
   * - registerInstructor 등의 분리된 메서드 호출 대신, 기존 Repo 활용 로직으로 통합 및 정리
   */
  async register(dto) {
    // dto: { email, password, name, phoneNumber, address, type, virtueIds, teamId, category }
    const {
      email,
      password,
      name,
      phoneNumber,
      address,
      type,
      virtueIds,
      teamId,
      category,
    } = dto;

    if (!email || !password || !name || !phoneNumber) {
      throw new Error('필수 정보가 누락되었습니다.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new Error('이미 가입된 이메일입니다.');

    const verification = await authRepository.findLatestVerification(email);
    if (!verification || !verification.isVerified) {
      throw new Error('이메일 인증이 완료되지 않았습니다.');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const commonData = {
      userEmail: email,
      password: hashedPassword,
      name,
      userphoneNumber: phoneNumber,
      status: 'PENDING', // 승인 대기
    };

    let newUser;

    if (type === 'INSTRUCTOR') {
      if (!address) throw new Error('강사는 거주지 주소를 입력해야 합니다.');
      if (!teamId || !category || !virtueIds || virtueIds.length === 0) {
        throw new Error('강사 과목(덕목), 팀, 직책 정보를 모두 입력해야 합니다.');
      }

      // 1) User + Instructor 생성
      newUser = await userRepository.createInstructor(commonData, {
        location: address,
        teamId: teamId || null,
        category: category || null,
        lat: null,
        lng: null,
      });

// 2) InstructorVirtue (강사가능덕목) 관계 저장
// 2) InstructorVirtue (강사가능덕목) 관계 저장
      await instructorRepository.addVirtues(newUser.id, virtueIds)
    } else {
      // 일반 유저
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


  async login(email, password, loginType, deviceId ) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('가입되지 않은 이메일입니다.');

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) throw new Error('비밀번호가 일치하지 않습니다.');

    if (user.status !== 'APPROVED') {
      throw new Error('승인되지 않은 사용자입니다.');
    }
    if (loginType === 'ADMIN' && user.role === 'USER') {
      throw new Error('관리자 권한이 없습니다.');
    }

    const payload = { userId: user.id };

    // 1. Access Token (짧게: 1시간)
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    // 2. Refresh Token (길게: 7일)
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후

    // 3. 리프레시 토큰 저장 (레포지토리 사용)
    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt, deviceId );

    // 4. 유저 정보 구성 (변수 선언 추가)
    const isInstructor = !!user.instructor;
    const isAdmin = !!user.admin;
    const adminLevel = user.admin?.level || null;

    const responseUser = {
      id: user.id,
      email: user.userEmail,
      name: user.name,
      status: user.status,
      isAdmin,
      adminLevel,
      isInstructor,
    };

    return {
      accessToken,
      refreshToken,
      user: responseUser,
    };
  }

  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) throw new new Error('리프레시 토큰이 없습니다.');

    // 1. 토큰 검증
    let payload;
    try {
      // jwt.verify()가 실패하면 catch 블록으로 이동
      payload = jwt.verify(incomingRefreshToken, REFRESH_SECRET);
    } catch (e) {
      // 만료 또는 유효하지 않은 토큰 처리
      throw new Error('리프레시 토큰이 만료되었거나 유효하지 않습니다.');
    }

    // 2. DB 확인 (레포지토리 사용)
    const dbToken = await authRepository.findRefreshToken(payload.userId, incomingRefreshToken);

    if (!dbToken) {
      // DB에 없는 토큰 -> 위변조되었거나 강제 로그아웃됨
      throw new Error('유효하지 않은 리프레시 토큰입니다. (재로그인 필요)');
    }

    // 3. 새 Access Token 발급
    const newAccessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, {
      expiresIn: '1h',
    });

    return { accessToken: newAccessToken };
  }

  // [신규] 로그아웃 (DB에서 리프레시 토큰 삭제)
  async logout(userId, deviceId) {
    if (userId) {
        // userId와 deviceId를 모두 넘겨서 구체적으로 삭제 요청
        await authRepository.deleteRefreshToken(userId, deviceId);
    }
    return { message: '로그아웃 되었습니다.' };
  }
  /**
   * 5. 비밀번호 재설정
   */
  async resetPassword(email, code, newPassword) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('가입되지 않은 이메일입니다.');

    // 인증 번호 확인
    const record = await authRepository.findLatestVerification(email);
    if (!record || record.code !== code) {
      throw new Error('인증번호가 올바르지 않습니다.');
    }
    
    if (new Date() > record.expiresAt) throw new Error('인증번호가 만료되었습니다.');

    // 비밀번호 변경
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(user.id, hashedPassword);

    await authRepository.deleteVerifications(email);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}

module.exports = new AuthService();