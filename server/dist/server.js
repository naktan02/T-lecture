"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = __importDefault(require("./config"));
const middlewares_1 = require("./common/middlewares");
const v1_1 = __importDefault(require("./api/v1"));
const errorHandler_1 = __importDefault(require("./common/middlewares/errorHandler"));
const logger_1 = __importDefault(require("./config/logger"));
require("./jobs/distanceBatch.job");
const app = (0, express_1.default)();
const isProd = process.env.NODE_ENV === 'production';
const parseOrigins = (value) => (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
// ✅ NODE_ENV에 따라 env 변수 하나만 선택
const allowedOrigins = isProd
    ? parseOrigins(process.env.CORS_ORIGINS_PROD)
    : parseOrigins(process.env.CORS_ORIGINS_DEV);
// ✅ 운영인데 PROD 오리진이 비어있으면 즉시 실패(안전)
if (isProd && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS_PROD must be set in production');
}
// ✅ 개발인데 DEV 오리진도 비어있으면 기본값 제공(선택)
if (!isProd && allowedOrigins.length === 0) {
    allowedOrigins.push('http://localhost:5173');
}
app.use((0, cors_1.default)({
    origin(origin, callback) {
        // 서버-서버 요청(origin 없이 올 수 있음)은 허용
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // 허용되지 않은 origin
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// preflight(OPTIONS) 허용
app.options('*', (req, res) => {
    res.sendStatus(200);
});
app.use(express_1.default.json());
app.use(middlewares_1.requestLogger);
app.use((0, cookie_parser_1.default)());
// 모든 v1 API는 /api/v1 아래로
app.use('/api/v1', v1_1.default);
// 기본 라우트
app.get('/', (req, res) => {
    res.send('Hello T-LECTURE!');
});
app.use(errorHandler_1.default);
// 서버 시작
const server = app.listen(config_1.default.port, () => {
    logger_1.default.info(`Server listening at http://localhost:${config_1.default.port}`);
});
module.exports = { app, server };
