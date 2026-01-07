/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import {
  UserCategory,
  AssignmentCategory,
  AssignmentState,
  AssignmentRole,
} from '../src/generated/prisma/client.js';

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     T-lecture 배정 데이터 시드 (Assignments)               ║');
  console.log('║     📅 기존 UnitSchedule에 강사를 무작위 배정              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  // 1. 데이터 로드
  console.log('[1/3] 기본 데이터 로드 중...');
  const instructors = await prisma.instructor.findMany({
    include: { user: true },
  });
  if (instructors.length === 0) {
    console.log('❌ 강사 데이터가 없습니다. seedBase.ts를 먼저 실행해주세요.');
    return;
  }
  console.log(`  ✅ 강사 ${instructors.length}명 로드됨`);

  const schedules = await prisma.unitSchedule.findMany({
    include: {
      trainingPeriod: {
        include: { unit: true },
      },
      scheduleLocations: true,
    },
    orderBy: { date: 'asc' },
  });
  if (schedules.length === 0) {
    console.log('❌ 일정 데이터가 없습니다. seedBase.ts를 먼저 실행해주세요.');
    return;
  }
  console.log(`  ✅ 부대 일정 ${schedules.length}개 로드됨`);

  // 2. 배정 생성
  console.log('\n[2/3] 배정 및 거리 데이터 생성 중...');
  let assignmentCount = 0;
  let distanceCount = 0;

  for (const schedule of schedules) {
    // 교육장소가 없으면 스킵
    if (schedule.scheduleLocations.length === 0) continue;

    // 해당 일정에 배정할 강사 수 결정 (최소 2명 ~ 최대 5명)
    const requiredCount = Math.floor(Math.random() * 4) + 2;

    // 랜덤하게 강사 선택 (셔플)
    const shuffledInstructors = [...instructors].sort(() => Math.random() - 0.5);
    const selectedInstructors = shuffledInstructors.slice(0, requiredCount);

    // 역할을 위한 인덱스
    let assignedCount = 0;

    for (const instructor of selectedInstructors) {
      const location = schedule.scheduleLocations[0]; // 첫 번째 교육장소에 배정

      // 역할 결정 Logic
      let role: AssignmentRole = 'Supervisor'; // 기본값
      if (assignedCount === 0) role = 'Head'; // 첫 번째는 주강사(총괄)

      // 카테고리에 따른 분류 (단순화)
      const category: AssignmentCategory = Math.random() > 0.1 ? 'Confirmed' : 'Temporary';
      const state: AssignmentState = 'Accepted'; // 완료된 상태로 가정

      try {
        // 1. 배정 생성
        await prisma.instructorUnitAssignment.create({
          data: {
            userId: instructor.userId,
            unitScheduleId: schedule.id,
            trainingLocationId: location.trainingLocationId,
            classification: category,
            state: state,
            role: role,
          },
        });
        assignmentCount++;

        // 2. 거리 데이터 생성 (Unit과 Instructor 사이)
        // 이미 존재하는지 확인
        const existingDistance = await prisma.instructorUnitDistance.findUnique({
          where: {
            userId_unitId: {
              userId: instructor.userId,
              unitId: schedule.trainingPeriod.unitId,
            },
          },
        });

        if (!existingDistance) {
          await prisma.instructorUnitDistance.create({
            data: {
              userId: instructor.userId,
              unitId: schedule.trainingPeriod.unitId,
              distance: Math.floor(Math.random() * 100) + 10, // 10~110km
              duration: Math.floor(Math.random() * 120) + 30, // 30~150분
              preDistance: 0,
              preDuration: 0,
              needsRecalc: false,
            },
          });
          distanceCount++;
        }
      } catch (e) {
        // 중복 등 에러 무시
      }
      assignedCount++;
    }

    if (assignmentCount % 50 === 0) {
      process.stdout.write('.');
    }
  }

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ 배정 완료!                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  소요 시간: ${elapsedTime}초`.padEnd(61) + '║');
  console.log(`║  생성된 배정: ${assignmentCount}건`.padEnd(61) + '║');
  console.log(`║  생성된 거리 정보: ${distanceCount}건`.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실행 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
