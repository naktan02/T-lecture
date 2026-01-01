// prisma/migrations/manual/migrate_template_body.ts
// 기존 문자열 템플릿을 JSONB Token 배열로 마이그레이션하는 스크립트
// 실행: npx tsx prisma/migrations/manual/migrate_template_body.ts

import { PrismaClient } from '@prisma/client';
import { parseTemplateToTokens } from '../../src/types/template.types';

const prisma = new PrismaClient();

interface OldTemplate {
  key: string;
  body: string;
}

async function migrate() {
  console.log('🚀 Starting template migration...');

  // 기존 문자열 형태의 템플릿 조회 (raw query로 타입 우회)
  const templates = await prisma.$queryRaw<OldTemplate[]>`
    SELECT key, body::text as body 
    FROM "메시지_템플릿" 
    WHERE body IS NOT NULL
  `;

  console.log(`📋 Found ${templates.length} templates to migrate`);

  for (const t of templates) {
    try {
      // 이미 JSON 형식이면 건너뛰기
      if (typeof t.body === 'object') {
        console.log(`⏭️  ${t.key}: Already migrated, skipping`);
        continue;
      }

      // 문자열 → Token 배열로 파싱
      const tokens = parseTemplateToTokens(t.body);
      const jsonBody = { tokens };

      // JSONB로 업데이트
      await prisma.$executeRaw`
        UPDATE "메시지_템플릿" 
        SET body = ${JSON.stringify(jsonBody)}::jsonb 
        WHERE key = ${t.key}
      `;

      console.log(`✅ ${t.key}: Migrated (${tokens.length} tokens)`);
    } catch (error) {
      console.error(`❌ ${t.key}: Migration failed`, error);
    }
  }

  console.log('🎉 Migration completed!');
}

migrate()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
