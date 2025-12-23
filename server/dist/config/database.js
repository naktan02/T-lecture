"use strict";
// server/src/config/database.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDatabaseConfig = buildDatabaseConfig;
/**
 * 데이터베이스 연결 설정을 생성합니다.
 */
function buildDatabaseConfig() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is missing in environment variables');
    }
    return {
        url: databaseUrl,
        directUrl: process.env.DIRECT_URL,
    };
}
