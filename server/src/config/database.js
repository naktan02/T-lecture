// server/src/config/database.js 수정안
function buildDatabaseConfig() {
    // DATABASE_URL이 없을 경우에 대비한 최소한의 방어 로직
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is missing');
    }

    return {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL // 필요 시 추가
    };
}

module.exports = { buildDatabaseConfig };