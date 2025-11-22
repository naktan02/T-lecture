// common/middlewares/requestLogger.js
module.exports = (req, res, next) => {
    const start = Date.now();
    console.log(`[REQ] ${req.method} ${req.url}`);

    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`[RES] ${req.method} ${req.url} - ${res.statusCode} (${ms}ms)`);
    });

    next();
};
