// server/prisma/seed.ts
// 통합 테스트 데이터 시드 스크립트
// 실행: npx tsx prisma/seed.ts

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';
import { runSeedReset } from './seedReset';
import { runSeedCore } from './seedCore';
import { runSeedUsers } from './seedUsers';
import { runSeedUnits } from './seedUnits';
import { runSeedAssignments } from './seedAssignments';
import { runSeedNotices } from './seedNotices';
import { runSeedInquiries } from './seedInquiries';

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        T-lecture 통합 테스트 데이터 시드 스크립트          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // 1. DB 초기화
    console.log('\n[1/7] DB 초기화...');
    await runSeedReset();

    // 2. 핵심 데이터 (팀, 덕목, 관리자, 메시지 템플릿)
    console.log('\n[2/7] 핵심 메타데이터 생성...');
    await runSeedCore();

    // 3. 유저 데이터 (강사 90명, 일반유저 10명)
    console.log('\n[3/7] 유저 데이터 생성...');
    await runSeedUsers();

    // 4. 부대 데이터 (1000개)
    console.log('\n[4/7] 부대 데이터 생성...');
    await runSeedUnits();

    // 5. 배정 데이터 (400세트 + 거리)
    console.log('\n[5/7] 배정 데이터 생성...');
    await runSeedAssignments();

    // 6. 공지사항 (500개)
    console.log('\n[6/7] 공지사항 생성...');
    await runSeedNotices();

    // 7. 문의사항 (100개)
    console.log('\n[7/7] 문의사항 생성...');
    await runSeedInquiries();

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ 시드 완료!                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  소요 시간: ${elapsedTime}초`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  다음 단계:                                               ║');
    console.log('║  1. 통계 배치 실행:                                       ║');
    console.log('║     npx tsx src/jobs/statsBatch.job.ts                    ║');
    console.log('║                                                            ║');
    console.log('║  2. (선택) 엑셀 업로드 테스트용 파일 생성:                ║');
    console.log('║     npx tsx scripts/generateUnitsExcel.ts                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 테스트 계정:');
    console.log('   - 관리자: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (from .env)');
    console.log('   - 강사: instructor001@test.com ~ instructor090@test.com / test1234');
    console.log('   - 예비강사: user001@test.com ~ user010@test.com / test1234');
    console.log('');
  } catch (error) {
    console.error('\n❌ 시드 실행 중 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
