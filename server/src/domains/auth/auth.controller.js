// server/src/domains/auth/auth.controller.js

const authService = require('./auth.service');

// [인증번호 발송]
exports.sendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error('이메일을 입력해주세요.');

    const result = await authService.sendVerificationCode(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [인증번호 검증]
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) throw new Error('이메일과 인증번호를 입력해주세요.');

    const result = await authService.verifyCode(email, code);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [회원가입]
exports.register = async (req, res) => {
  try {
    // body: { email, password, name, phoneNumber, role, address }
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// [로그인]
exports.login = async (req, res) => {
  try {
    const { email, password, loginType, deviceId  } = req.body;
    
    // 서비스에서 AccessToken과 RefreshToken을 모두 받음
    const result = await authService.login(email, password, loginType, deviceId );

    // 🍪 Refresh Token을 쿠키에 설정 (HttpOnly 보안 적용)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, // JS 접근 불가
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
      sameSite: 'strict', 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일 (Refresh Token 만료 기간과 일치)
    });

    // Access Token과 사용자 정보를 JSON으로 클라이언트에 전송
    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    // 쿠키에서 리프레시 토큰 추출
    const refreshToken = req.cookies.refreshToken;
    
    // 서비스 로직 호출하여 새 Access Token 발급
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.status(200).json(result); // { accessToken: "..." } 반환
  } catch (error) {
    // 갱신 실패 시 (만료/유효하지 않음), 쿠키를 지우고 401 반환하여 프론트에서 재로그인 유도
    res.clearCookie('refreshToken');
    res.status(401).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { deviceId } = req.body;
    await authService.logout(req.user.id, deviceId); // deviceId 전달
    res.json({ message: "로그아웃 되었습니다." });
  } catch (error) {
    // 에러가 나더라도 쿠키는 지웠으므로, 성공 응답을 보냅니다.
    res.status(200).json({ message: '로그아웃 성공' });
  }
};

// [비밀번호 재설정]
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) throw new Error('필수 정보를 입력해주세요.');

    const result = await authService.resetPassword(email, code, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};