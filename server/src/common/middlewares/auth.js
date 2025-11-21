// common/middlewares/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../../libs/prisma');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // ⭐ DB에서 유저 정보 조회 (실무 필수)
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
    }

    if (user.status === 'BANNED' || user.status === 'REJECTED') {
      return res.status(403).json({ message: '접근이 제한된 계정입니다.' });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
