// common/middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
    console.error('[ERROR]', err);

    const status = err.statusCode || 500;
    const message = err.message || '서버 오류가 발생했습니다.';

    res.status(status).json({ message });
};
