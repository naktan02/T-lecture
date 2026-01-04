import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 0값 원인 분석 ===\n');

  // 1. 근무시간 없는 부대 확인
  const unitsWithoutWorkTime = await prisma.unit.count({
    where: {
      OR: [{ workStartTime: null }, { workEndTime: null }],
    },
  });
  console.log('근무시간 없는 부대:', unitsWithoutWorkTime);

  // 2. 배정된 부대 중 근무시간 없는 경우
  const assignmentsWithNoWorkTime = await prisma.instructorUnitAssignment.findMany({
    where: {
      state: 'Accepted',
    },
    include: {
      UnitSchedule: {
        include: {
          unit: true,
        },
      },
    },
    take: 50,
  });

  let noWorkTimeCount = 0;
  for (const a of assignmentsWithNoWorkTime) {
    if (!a.UnitSchedule?.unit?.workStartTime || !a.UnitSchedule?.unit?.workEndTime) {
      noWorkTimeCount++;
      if (noWorkTimeCount <= 3) {
        console.log(
          `  배정 (userId=${a.userId}): 부대 ${a.UnitSchedule?.unit?.name} - 근무시간 없음`,
        );
      }
    }
  }
  console.log(`배정 중 근무시간 없는 건: ${noWorkTimeCount}/${assignmentsWithNoWorkTime.length}\n`);

  // 3. 거리 데이터 확인
  const totalDistances = await prisma.instructorUnitDistance.count();
  console.log('총 거리 데이터 수:', totalDistances);

  // 4. 배정된 부대 중 거리 데이터 없는 경우
  const instructorIds = [...new Set(assignmentsWithNoWorkTime.map((a) => a.userId))];
  let noDistanceCount = 0;

  for (const a of assignmentsWithNoWorkTime) {
    const unitId = a.UnitSchedule?.unit?.id;
    if (!unitId) continue;

    const distance = await prisma.instructorUnitDistance.findUnique({
      where: {
        userId_unitId: {
          userId: a.userId,
          unitId: unitId,
        },
      },
    });

    if (!distance) {
      noDistanceCount++;
      if (noDistanceCount <= 3) {
        console.log(`  배정 (userId=${a.userId}, unitId=${unitId}): 거리 데이터 없음`);
      }
    }
  }
  console.log(`배정 중 거리 없는 건: ${noDistanceCount}/${assignmentsWithNoWorkTime.length}\n`);

  // 5. 샘플 부대의 workStartTime 확인
  console.log('=== 샘플 부대 근무시간 ===');
  const sampleUnits = await prisma.unit.findMany({ take: 5 });
  for (const u of sampleUnits) {
    console.log(`  ${u.name}: start=${u.workStartTime}, end=${u.workEndTime}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
