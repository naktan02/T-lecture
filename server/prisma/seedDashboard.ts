import { PrismaClient, AssignmentState, AssignmentCategory } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * 랜덤 날짜 생성 (start ~ end 사이)
 */
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🚀 대시보드 테스트 데이터 시딩 시작 (배정 및 통계 생성)...\n');

  // 1. 강사 및 부대 데이터 확인
  const instructors = await prisma.instructor.findMany({
    where: { profileCompleted: true }, // 프로필 완료된 강사만
    include: { user: true },
  });

  if (instructors.length === 0) {
    console.error('❌ 테스트할 강사 데이터가 없습니다. `npm run seed:users`를 먼저 실행해주세요.');
    return;
  }
  console.log(`📋 강사 ${instructors.length}명 확인됨`);

  // 2. 부대 데이터 확인 (DB)
  console.log('� 부대 데이터 로딩 (DB)...');

  const createdUnits = await prisma.unit.findMany();

  if (createdUnits.length === 0) {
    console.error(
      '❌ DB에 부대 데이터가 없습니다. 먼저 `npm run seed:unit`을 실행하여 부대 데이터를 생성해주세요.',
    );
    return;
  }
  console.log(`✅ 부대 ${createdUnits.length}개 확인됨. 배정 데이터를 생성합니다...\n`);

  // 3. 배정 및 거리 데이터 생성
  console.log('📅 배정 및 거리 데이터 생성 중...');

  // 날짜 범위: 6개월 전 ~ 1개월 후
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let assignmentCount = 0;

  for (const instructor of instructors) {
    // 각 강사당 5~20개의 활동 생성
    const activityCount = Math.floor(Math.random() * 15) + 5;

    // 강사와 부대 간 거리 데이터도 생성 필요 (대시보드 통계용)
    // 랜덤하게 10개 부대와 거리 정보 연결
    const associatedUnits = createdUnits.sort(() => Math.random() - 0.5).slice(0, 20);

    for (const unit of associatedUnits) {
      // 거리 정보 (10km ~ 100km)
      await prisma.instructorUnitDistance.upsert({
        where: { userId_unitId: { userId: instructor.userId, unitId: unit.id } },
        update: {},
        create: {
          userId: instructor.userId,
          unitId: unit.id,
          distance: Math.floor(Math.random() * 90) + 10,
          duration: Math.floor(Math.random() * 60) + 30,
        },
      });
    }

    // Assignment loop
    for (let i = 0; i < activityCount; i++) {
      try {
        const targetUnit = associatedUnits[Math.floor(Math.random() * associatedUnits.length)];
        const date = getRandomDate(sixMonthsAgo, oneMonthLater);

        const isAccepted = Math.random() > 0.2;
        let state: AssignmentState = 'Pending';
        if (isAccepted) state = 'Accepted';
        else state = Math.random() > 0.5 ? 'Rejected' : 'Canceled';

        // Create UnitSchedule
        const schedule = await prisma.unitSchedule.create({
          data: {
            unitId: targetUnit.id,
            date: date,
          },
        });

        // Create Assignment
        await prisma.instructorUnitAssignment.create({
          data: {
            userId: instructor.userId,
            unitScheduleId: schedule.id,
            classification: 'Confirmed', // Valid enum
            state: state,
          },
        });
        assignmentCount++;
      } catch (err: any) {
        console.error(`❌ 배정 생성 실패 (Instructor: ${instructor.userId}):`, err.message);
      }
    }
  }

  console.log(`✅ 배정 ${assignmentCount}건 생성 완료\n`);

  console.log('='.repeat(50));
  console.log('🎉 대시보드 테스트 데이터 준비 완료');
  console.log('='.repeat(50));
  console.log('이제 서버를 실행하고 배치 작업을 돌리거나 대시보드를 확인하세요.');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
