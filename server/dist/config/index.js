"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/config/index.ts
const database_1 = require("./database");
const dbConfig = (0, database_1.buildDatabaseConfig)();
const config = {
    // process.env.PORT는 문자열이므로 숫자로 변환합니다.
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: dbConfig.url,
    directUrl: dbConfig.directUrl,
    kakao: {
        restApiKey: process.env.KAKAO_REST_API_KEY,
    },
    nodeEnv: process.env.NODE_ENV || 'development',
};
exports.default = config;
