const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const authRepository = require('../repositories/auth.repository');
const userRepository = require('../../user/repositories/user.repository');
const emailService = require('../../../infra/email.service');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

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
   */
  async register(dto) {
    const { email, password, name, phoneNumber, role, address } = dto;

    // 3-1. 중복 확인 (DB 필드: userEmail)
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new Error('이미 가입된 이메일입니다.');

    // 3-2. 인증 여부 확인
    const verification = await authRepository.findLatestVerification(email);
    if (!verification || !verification.isVerified) {
      throw new Error('이메일 인증이 완료되지 않았습니다.');
    }

    // 3-3. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3-4. DB 저장 데이터 구성 (DB 필드명에 맞춤)
    const commonData = {
      userEmail: email,          // 매핑: email -> userEmail
      password: hashedPassword,
      name,
      userphoneNumber: phoneNumber, // 매핑: phoneNumber -> userphoneNumber
      role: role || 'USER',
      status: 'PENDING',         // 기본 상태: 승인 대기
    };

    let newUser;
    if (role === 'INSTRUCTOR') {
      if (!address) throw new Error('강사는 주소를 입력해야 합니다.');
      // 강사 데이터 구성 (DB 필드: location)
      newUser = await userRepository.createInstructor(commonData, {
        location: address, // 매핑: address -> location
        lat: null,
        lng: null,
      });
    } else {
      newUser = await userRepository.createUser(commonData);
    }

    // 3-5. 인증 기록 정리
    await authRepository.deleteVerifications(email);

    return {
      id: newUser.id,
      email: newUser.userEmail,
      name: newUser.name,
      role: newUser.role,
      status: newUser.status,
      message: '가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.',
    };
  }

  /**
   * 4. 로그인
   */
  async login(email, password) {
    // DB 필드 userEmail로 조회
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('이메일 또는 비밀번호가 잘못되었습니다.');

    // 승인 상태 체크
    if (user.status === 'PENDING') throw new Error('관리자 승인 대기 중인 계정입니다.');
    if (user.status === 'REJECTED') throw new Error('가입 승인이 거절된 계정입니다.');
    if (user.status === 'INACTIVE') throw new Error('비활성화된 계정입니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('이메일 또는 비밀번호가 잘못되었습니다.');

    // 토큰 발급
    const token = jwt.sign(
      {
        id: user.id,
        email: user.userEmail,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.userEmail,
        name: user.name,
        role: user.role,
      },
    };
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
    // (재설정의 경우 verifyCode 단계를 건너뛰고 바로 요청할 수도 있으므로 여기서 유효기간 등 체크 필요)
    if (new Date() > record.expiresAt) throw new Error('인증번호가 만료되었습니다.');

    // 비밀번호 변경
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(user.id, hashedPassword);

    await authRepository.deleteVerifications(email);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}

module.exports = new AuthService();