// middlewares/admin.middleware.js

// 관리자(일반 + 슈퍼) 공통
function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || !user.isAdmin) {
        return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }
    next();
    }

    // 슈퍼 관리자만
    function requireSuperAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.adminLevel !== 'SUPER') {
        return res.status(403).json({ error: '슈퍼 관리자만 사용할 수 있는 기능입니다.' });
    }
    next();
}

module.exports = {
    requireAdmin,
    requireSuperAdmin,
};
