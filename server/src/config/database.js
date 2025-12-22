// server/src/config/database.js 수정안
function buildDatabaseConfig() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing');
    }
    return {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL
    };
}

module.exports = { buildDatabaseConfig };