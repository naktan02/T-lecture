// common/middlewares/requireRole.js
module.exports = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: '권한이 없습니다.' });
        }

        next();
    };
};
