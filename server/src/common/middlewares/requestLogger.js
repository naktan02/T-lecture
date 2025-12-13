// server/src/common/middlewares/requestLogger.js
const logger = require('../../config/logger');

function shouldSkip(req) {
    const url = req.originalUrl || req.url || '';
    if (req.method === 'OPTIONS') return true;
    if (url.startsWith('/health') || url.startsWith('/metrics')) return true;
    if (url === '/favicon.ico') return true;
    return false;
}

module.exports = (req, res, next) => {
    if (shouldSkip(req)) return next();

    const start = Date.now();

    res.on('finish', () => {
        const statusCode = res.statusCode;

        // ✅ 5xx는 errorHandler 로깅에 맡김
        if (statusCode >= 500) return;

        const payload = {
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode,
            durationMs: Date.now() - start,
            userId: req.user?.id ?? null,
            queryKeys: Object.keys(req.query || {}),
        };

        if (statusCode >= 400) logger.warn('[RES]', payload);
        else logger.info('[RES]', payload);
    });

    next();
};
