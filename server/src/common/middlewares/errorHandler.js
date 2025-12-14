// server/src/common/middlewares/errorHandler.js
const logger = require('../../config/logger');
const { mapPrismaError } = require('../errors/prismaErrorMapper');


const defaultCodeByStatus = (statusCode) => {
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  return 'INTERNAL_ERROR';
};


module.exports = (err, req, res, next) => {

    const mapped = mapPrismaError(err);
    if (mapped) err = mapped;

    const statusCode = Number(err.statusCode || err.status || 500);
    const code = err.code || defaultCodeByStatus(statusCode);

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
    const isAppError = err.isAppError === true;
    const safeMessage = isProd && !isAppError ? 'Internal Server Error' : err.message;


    res.status(statusCode).json({
        error: safeMessage,
        statusCode,
        code,
        // ...(isProd ? {} : { stack: err.stack }),
    });
};
