// server/prisma.config.ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma', // 디렉터리 전체를 스키마로 사용
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // CLI (마이그레이션 등)에서 사용할 URL
    // Supabase는 직접 연결 또는 pooler 사용
    url: env('DATABASE_URL'),
  },
});
