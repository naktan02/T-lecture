// common/middlewares/requireRole.js

function requireRole(requiredRole) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
        }

        if (requiredRole === 'ADMIN') {
        if (!user.isAdmin) {
            return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
        }
        return next();
        }

        if (requiredRole === 'INSTRUCTOR') {
        if (!user.isInstructor) {
            return res.status(403).json({ error: '강사만 접근할 수 있습니다.' });
        }
        return next();
        }

        // 혹시 옛날 'USER' 같은 값 쓰던 곳이 있으면 여기서 처리
        if (user.role !== requiredRole) {
        return res.status(403).json({ error: '권한이 없습니다.' });
        }

        next();
    };
}

module.exports = requireRole;
