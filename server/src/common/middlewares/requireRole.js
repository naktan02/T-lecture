// common/middlewares/requireRole.js
const AppError = require('../errors/AppError');

function requireRole(requiredRole) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
        return next(new AppError('인증이 필요합니다.', 401, 'UNAUTHORIZED'))    ;
        }

        if (requiredRole === 'ADMIN') {
        if (!user.isAdmin) {
            return next(new AppError('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
        }
        return next();
        }

        if (requiredRole === 'INSTRUCTOR') {
        if (!user.isInstructor) {
            return next(new AppError('강사만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
        }
        return next();
        }

        // 혹시 옛날 'USER' 같은 값 쓰던 곳이 있으면 여기서 처리
        if (user.role !== requiredRole) {
        return next(new AppError('권한이 없습니다.', 403, 'FORBIDDEN'));
        }

        next();
    };
}

module.exports = requireRole;
