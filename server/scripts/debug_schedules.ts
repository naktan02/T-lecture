import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 스케줄 및 날짜 범위 디버깅 ===\n');

  // 1. 전체 스케줄 수
  const totalSchedules = await prisma.unitSchedule.count();
  const validSchedules = await prisma.unitSchedule.count({ where: { isExcluded: false } });
  console.log(`📅 전체 스케줄: ${totalSchedules}개`);
  console.log(`✅ 유효 스케줄 (isExcluded=false): ${validSchedules}개`);

  // 2. 스케줄 날짜 범위 확인
  const minDate = await prisma.unitSchedule.findFirst({
    where: { isExcluded: false },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  const maxDate = await prisma.unitSchedule.findFirst({
    where: { isExcluded: false },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  console.log(`\n📆 스케줄 날짜 범위:`);
  console.log(`   최소: ${minDate?.date?.toISOString().split('T')[0] || 'N/A'}`);
  console.log(`   최대: ${maxDate?.date?.toISOString().split('T')[0] || 'N/A'}`);

  // 3. seed:dashboard의 날짜 범위
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  console.log(`\n📅 seed:dashboard 검색 범위:`);
  console.log(`   시작: ${sixMonthsAgo.toISOString().split('T')[0]}`);
  console.log(`   종료: ${oneMonthLater.toISOString().split('T')[0]}`);

  // 4. 범위 내 스케줄 수
  const inRangeCount = await prisma.unitSchedule.count({
    where: {
      isExcluded: false,
      date: {
        gte: sixMonthsAgo,
        lte: oneMonthLater,
      },
    },
  });
  console.log(`\n🔍 검색 범위 내 유효 스케줄: ${inRangeCount}개`);

  // 5. 강사 수
  const instructorCount = await prisma.instructor.count({ where: { profileCompleted: true } });
  console.log(`\n👨‍🏫 프로필 완료 강사: ${instructorCount}명`);

  // 6. 현재 배정 수
  const assignmentCount = await prisma.instructorUnitAssignment.count();
  console.log(`📋 현재 배정: ${assignmentCount}건`);

  // 7. 샘플 스케줄 출력
  const sampleSchedules = await prisma.unitSchedule.findMany({
    where: { isExcluded: false },
    take: 5,
    orderBy: { date: 'asc' },
    include: { unit: { select: { name: true } } },
  });
  console.log('\n📝 샘플 스케줄:');
  sampleSchedules.forEach((s) => {
    console.log(`   - ${s.date?.toISOString().split('T')[0]} | ${s.unit.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
