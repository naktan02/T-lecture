import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.unit.count();
  const schedules = await prisma.unitSchedule.count();
  const locations = await prisma.trainingLocation.count();
  const assignments = await prisma.instructorUnitAssignment.count();

  console.log('=== DB 데이터 현황 ===');
  console.log('부대 (Unit):', units);
  console.log('부대일정 (UnitSchedule):', schedules);
  console.log('교육장소 (TrainingLocation):', locations);
  console.log('배정 (Assignment):', assignments);

  // 거리 정보 확인
  const distances = await prisma.instructorUnitDistance.count();
  console.log('강사-부대 거리:', distances);

  // 샘플 부대 확인
  if (units > 0) {
    const sampleUnit = await prisma.unit.findFirst({
      include: {
        schedules: { take: 3 },
        trainingLocations: { take: 1 },
      },
    });
    console.log('\n=== 샘플 부대 ===');
    console.log('부대명:', sampleUnit?.name);
    console.log('교육시작:', sampleUnit?.educationStart);
    console.log('교육종료:', sampleUnit?.educationEnd);
    console.log('일정 수:', sampleUnit?.schedules?.length);
    console.log('교육장소 수:', sampleUnit?.trainingLocations?.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
