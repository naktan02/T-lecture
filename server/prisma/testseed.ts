// server/prisma/testseed.ts
// 통합 테스트 데이터 시드 스크립트
// 실행: npx tsx prisma/testseed.ts

/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import { runSeedReset } from './seedReset';
import { runSeedCore } from './seedCore';
import { runSeedUsers } from './seedUsers';
import { runSeedUnits } from './seedUnits';
import { runSeedAssignments } from './seedAssignments';
import { runSeedDispatches } from './seedDispatches';
import { runSeedNotices } from './seedNotices';
import { runSeedInquiries } from './seedInquiries';

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        T-lecture 통합 테스트 데이터 시드 스크립트          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // 1. DB 초기화
    console.log('\n[1/8] DB 초기화...');
    await runSeedReset();

    // 2. 핵심 데이터 (팀, 덕목, 관리자, 메시지 템플릿)
    console.log('\n[2/8] 핵심 메타데이터 생성...');
    await runSeedCore();

    // 3. 유저 데이터 (강사 80명, 일반유저 10명, 가입대기 10명)
    console.log('\n[3/8] 유저 데이터 생성...');
    await runSeedUsers();

    // 4. 부대 데이터 (2025년 1000개 + 2026년 100개)
    console.log('\n[4/8] 부대 데이터 생성...');
    await runSeedUnits();

    // 5. 배정 데이터 (TrainingPeriod별 3일 연속)
    console.log('\n[5/8] 배정 데이터 생성...');
    await runSeedAssignments();

    // 6. Dispatch 메시지 데이터
    console.log('\n[6/8] 배정 메시지 생성...');
    await runSeedDispatches();

    // 7. 공지사항 (500개)
    console.log('\n[7/8] 공지사항 생성...');
    await runSeedNotices();

    // 8. 문의사항 (100개)
    console.log('\n[8/8] 문의사항 생성...');
    await runSeedInquiries();

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ 시드 완료!                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  소요 시간: ${elapsedTime}초`.padEnd(61) + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  생성 데이터:                                              ║');
    console.log('║  - 팀: 7개, 덕목: 15개                                     ║');
    console.log('║  - 유저: 강사 80명 + 일반 10명 + 가입대기 10명            ║');
    console.log('║  - 부대: 2025년 1000개 + 2026년 100개                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 테스트 계정:');
    console.log('   - 관리자: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (from .env)');
    console.log('   - 강사: instructor001@test.com ~ instructor080@test.com / test1234');
    console.log('   - 일반유저: user001@test.com ~ user010@test.com / test1234');
    console.log('   - 가입대기: pending001@test.com ~ pending010@test.com / test1234');
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
