const authService = require('../services/auth.service');

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
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
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