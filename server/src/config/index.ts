// server/src/config/index.ts
import { buildDatabaseConfig } from './database';

interface Config {
  port: number;
  databaseUrl: string;
  directUrl?: string;
  kakao: {
    restApiKey?: string;
  };
  nodeEnv: string;
}

const dbConfig = buildDatabaseConfig();

const config: Config = {
  // process.env.PORT는 문자열이므로 숫자로 변환합니다.
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: dbConfig.url,
  directUrl: dbConfig.directUrl,
  kakao: {
    restApiKey: process.env.KAKAO_REST_API_KEY,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;