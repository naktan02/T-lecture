// middlewares/admin.middleware.js
const AppError = require('../errors/AppError');

// 관리자(일반 + 슈퍼) 공통
function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || !user.isAdmin) {
        return next(new AppError('관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
    }
    next();
    }

    // 슈퍼 관리자만
    function requireSuperAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.adminLevel !== 'SUPER') {
        return next(new AppError('슈퍼 관리자만 접근할 수 있습니다.', 403, 'FORBIDDEN'));
    }
    next();
}

module.exports = {
    requireAdmin,
    requireSuperAdmin,
};
