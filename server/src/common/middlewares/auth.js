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

    // 🔹 로그인 때 넣은 userId 사용
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        status: true,
        name: true,
        userEmail: true,
        admin: {       // 관리자 여부 + 레벨
          select: {
            level: true,   // 'GENERAL' | 'SUPER'
          },
        },
        instructor: {  // 강사 여부
          select: { userId: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
    }

    // 상태 체크 (원하는 정책대로 수정 가능)
    if (user.status === 'INACTIVE') {
      return res.status(403).json({ message: '접근이 제한된 계정입니다.' });
    }

    // 🔹 컨트롤러/미들웨어에서 편하게 쓰도록 가공
    req.user = {
      id: user.id,
      status: user.status,
      name: user.name,
      userEmail: user.userEmail,
      isAdmin: !!user.admin,
      adminLevel: user.admin?.level || null,  // 'GENERAL' | 'SUPER' | null
      isInstructor: !!user.instructor,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    }
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
