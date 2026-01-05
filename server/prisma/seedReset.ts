// server/prisma/seedReset.ts
// DB 초기화 스크립트 - 모든 테스트 데이터 삭제
// 실행: npx tsx prisma/seedReset.ts

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runSeedReset() {
  console.log('🗑️ DB 초기화 시작...\n');

  // 삭제 순서 (외래키 제약 고려)
  const deleteOperations = [
    { name: 'DispatchAssignment', fn: () => prisma.dispatchAssignment.deleteMany() },
    { name: 'Dispatch', fn: () => prisma.dispatch.deleteMany() },
    { name: 'NoticeReceipt', fn: () => prisma.noticeReceipt.deleteMany() },
    { name: 'Notice', fn: () => prisma.notice.deleteMany() },
    { name: 'Inquiry', fn: () => prisma.inquiry.deleteMany() },
    { name: 'InstructorUnitAssignment', fn: () => prisma.instructorUnitAssignment.deleteMany() },
    { name: 'UnitSchedule', fn: () => prisma.unitSchedule.deleteMany() },
    { name: 'TrainingLocation', fn: () => prisma.trainingLocation.deleteMany() },
    { name: 'Unit', fn: () => prisma.unit.deleteMany() },
    { name: 'InstructorPriorityCredit', fn: () => prisma.instructorPriorityCredit.deleteMany() },
    { name: 'InstructorPenalty', fn: () => prisma.instructorPenalty.deleteMany() },
    { name: 'InstructorStats', fn: () => prisma.instructorStats.deleteMany() },
    { name: 'InstructorVirtue', fn: () => prisma.instructorVirtue.deleteMany() },
    { name: 'InstructorAvailability', fn: () => prisma.instructorAvailability.deleteMany() },
    { name: 'InstructorUnitDistance', fn: () => prisma.instructorUnitDistance.deleteMany() },
    { name: 'Instructor', fn: () => prisma.instructor.deleteMany() },
    { name: 'Admin', fn: () => prisma.admin.deleteMany() },
    { name: 'RefreshToken', fn: () => prisma.refreshToken.deleteMany() },
    { name: 'User', fn: () => prisma.user.deleteMany() },
    { name: 'Virtue', fn: () => prisma.virtue.deleteMany() },
    { name: 'Team', fn: () => prisma.team.deleteMany() },
    { name: 'MessageTemplate', fn: () => prisma.messageTemplate.deleteMany() },
    { name: 'EmailVerification', fn: () => prisma.emailVerification.deleteMany() },
    { name: 'KakaoApiUsage', fn: () => prisma.kakaoApiUsage.deleteMany() },
  ];

  for (const op of deleteOperations) {
    try {
      const result = await op.fn();
      if (result.count > 0) {
        console.log(`  ✅ ${op.name}: ${result.count}개 삭제`);
      }
    } catch (error: any) {
      console.log(`  ⚠️ ${op.name}: ${error.message}`);
    }
  }

  console.log('\n✅ DB 초기화 완료!\n');
}

// 직접 실행 시
if (require.main === module) {
  runSeedReset()
    .catch((e) => {
      console.error('❌ 초기화 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
