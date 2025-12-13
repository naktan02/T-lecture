// common/middlewares/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../../libs/prisma');
const AppError = require('../errors/AppError'); // 너 프로젝트 경로에 맞게

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('인증 토큰이 없습니다.', 401, 'NO_AUTH_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        throw new AppError('토큰이 만료되었습니다.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('유효하지 않은 토큰입니다.', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        status: true,
        name: true,
        userEmail: true,
        admin: { select: { level: true } },
        instructor: { select: { userId: true } },
      },
    });

    if (!user) {
      throw new AppError('존재하지 않는 사용자입니다.', 401, 'USER_NOT_FOUND');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('접근이 제한된 계정입니다.', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = {
      id: user.id,
      status: user.status,
      name: user.name,
      userEmail: user.userEmail,
      isAdmin: !!user.admin,
      adminLevel: user.admin?.level || null,
      isInstructor: !!user.instructor,
    };

    next();
  } catch (err) {
    next(err); // ✅ 전역 에러 핸들러로 보냄
  }
};
