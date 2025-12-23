// server/src/config/database.ts

interface DatabaseConfig {
  url: string;
  directUrl?: string;
}

/**
 * 데이터베이스 연결 설정을 생성합니다.
 */
export function buildDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in environment variables');
  }

  return {
    url: databaseUrl,
    directUrl: process.env.DIRECT_URL,
  };
}