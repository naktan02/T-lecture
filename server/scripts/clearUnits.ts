// server/scripts/clearUnits.ts
// 부대 데이터 삭제 스크립트 (참조 관계 순서대로 삭제)
// 실행: npx tsx scripts/clearUnits.ts

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUnits() {
  console.log('🗑️ 부대 관련 데이터 삭제 시작...\n');

  // 1. 배정 관련 먼저 삭제
  console.log('1. DispatchAssignment 삭제 중...');
  const dispatchAssignments = await prisma.dispatchAssignment.deleteMany();
  console.log(`   ✅ ${dispatchAssignments.count}개 삭제`);

  console.log('2. InstructorUnitAssignment 삭제 중...');
  const assignments = await prisma.instructorUnitAssignment.deleteMany();
  console.log(`   ✅ ${assignments.count}개 삭제`);

  console.log('3. InstructorUnitDistance 삭제 중...');
  const distances = await prisma.instructorUnitDistance.deleteMany();
  console.log(`   ✅ ${distances.count}개 삭제`);

  // 2. 일정 삭제
  console.log('4. UnitSchedule 삭제 중...');
  const schedules = await prisma.unitSchedule.deleteMany();
  console.log(`   ✅ ${schedules.count}개 삭제`);

  // 3. 교육장소 삭제
  console.log('5. TrainingLocation 삭제 중...');
  const locations = await prisma.trainingLocation.deleteMany();
  console.log(`   ✅ ${locations.count}개 삭제`);

  // 4. 부대 삭제
  console.log('6. Unit 삭제 중...');
  const units = await prisma.unit.deleteMany();
  console.log(`   ✅ ${units.count}개 삭제`);

  console.log('\n✅ 부대 관련 데이터 삭제 완료!');
}

clearUnits()
  .catch((e) => {
    console.error('❌ 삭제 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
