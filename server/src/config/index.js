// src/config/index.js
const { buildDatabaseConfig } = require('./database');

const dbConfig = buildDatabaseConfig(); 

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: dbConfig.url,
  directUrl: dbConfig.directUrl,
  kakao: {
    restApiKey: process.env.KAKAO_REST_API_KEY,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};
