// server/src/common/middlewares/errorHandler.js
const logger = require('../../config/logger');

module.exports = (err, req, res, next) => {
    const statusCode = Number(err.statusCode || err.status || 500);
    const code = err.code || 'INTERNAL_ERROR';

    const logPayload = {
        code,
        statusCode,
        message: err.message,
        userId: req.user?.id || null,
        method: req.method,
        url: req.originalUrl || req.url,
        stack: err.stack,
        meta: err.meta || null,
    };

    if (statusCode >= 500) logger.error('[API ERROR]', logPayload);
    else logger.warn('[API ERROR]', logPayload);

    const isProd = process.env.NODE_ENV === 'production';

    res.status(statusCode).json({
        error: err.message,
        statusCode,
        code,
        // ...(isProd ? {} : { stack: err.stack }),
    });
};
