// server/prisma/seedtest.ts
// 테스트 데이터 시드 (강사 + 부대 + 배정)
// 실행: npx tsx prisma/seedtest.ts

/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import { runSeedInstructors } from './seedInstructors.js';
import { runSeedUnits } from './seedUnits.js';

// 오늘 기준 주차 정보 계산
function getWeekInfo(today: Date) {
  // 이번주 월요일 계산
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() + mondayOffset);
  thisMonday.setUTCHours(0, 0, 0, 0);

  // 이번주 일요일
  const thisSunday = new Date(thisMonday);
  thisSunday.setUTCDate(thisMonday.getUTCDate() + 6);
  thisSunday.setUTCHours(23, 59, 59, 999);

  // 다음주 월요일 ~ 일요일
  const nextMonday = new Date(thisMonday);
  nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setUTCDate(nextMonday.getUTCDate() + 6);
  nextSunday.setUTCHours(23, 59, 59, 999);

  return {
    today,
    thisMonday,
    thisSunday,
    nextMonday,
    nextSunday,
  };
}

// 배정 상태 결정
function getAssignmentState(
  scheduleDate: Date,
  weekInfo: ReturnType<typeof getWeekInfo>,
): 'Accepted' | 'Pending' | null {
  const { today, thisSunday, nextSunday } = weekInfo;

  // 오늘 이전 또는 이번주: Accepted
  if (scheduleDate <= thisSunday) {
    return 'Accepted';
  }

  // 다음주: Pending
  if (scheduleDate <= nextSunday) {
    return 'Pending';
  }

  // 그 이후: 배정 없음
  return null;
}

async function createAssignments() {
  console.log('\n📋 배정 데이터 생성 시작...\n');

  const today = new Date();
  const weekInfo = getWeekInfo(today);

  console.log(`  📅 오늘: ${today.toISOString().split('T')[0]}`);
  console.log(`  📅 이번주: ${weekInfo.thisMonday.toISOString().split('T')[0]} ~ ${weekInfo.thisSunday.toISOString().split('T')[0]}`);
  console.log(`  📅 다음주: ${weekInfo.nextMonday.toISOString().split('T')[0]} ~ ${weekInfo.nextSunday.toISOString().split('T')[0]}\n`);

  // 강사당 교육생 수 설정 조회
  const traineesConfig = await prisma.systemConfig.findUnique({
    where: { key: 'TRAINEES_PER_INSTRUCTOR' },
  });
  const traineesPerInstructor = traineesConfig?.value ? parseInt(traineesConfig.value, 10) : 36;
  console.log(`  👥 강사당 교육생 수: ${traineesPerInstructor}명`);

  // 주강사 목록 조회 (Main 카테고리)
  const mainInstructors = await prisma.user.findMany({
    where: {
      instructor: { category: 'Main' },
      status: 'APPROVED',
    },
    include: {
      instructor: {
        include: {
          availabilities: true,
        },
      },
    },
  });

  // 보조/부강사/실습 강사 목록 조회
  const subInstructors = await prisma.user.findMany({
    where: {
      instructor: { category: { in: ['Co', 'Assistant', 'Practicum'] } },
      status: 'APPROVED',
    },
    include: {
      instructor: {
        include: {
          availabilities: true,
        },
      },
    },
  });

  console.log(`  👨‍🏫 주강사: ${mainInstructors.length}명`);
  console.log(`  👨‍🏫 보조강사: ${subInstructors.length}명\n`);

  // 모든 UnitSchedule 조회 (배정 대상)
  const schedules = await prisma.unitSchedule.findMany({
    include: {
      trainingPeriod: {
        include: {
          unit: true,
        },
      },
      scheduleLocations: true,
    },
    orderBy: { date: 'asc' },
  });

  console.log(`  📅 총 일정 수: ${schedules.length}개\n`);

  let acceptedCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;

  // 강사 인덱스 (라운드 로빈 배정용)
  let mainIdx = 0;
  let subIdx = 0;

  for (const schedule of schedules) {
    if (!schedule.date) continue;

    const state = getAssignmentState(schedule.date, weekInfo);

    if (state === null) {
      skippedCount++;
      continue;
    }

    // 해당 일정의 총 계획인원 계산
    const totalPlanned = schedule.scheduleLocations.reduce(
      (sum, sl) => sum + (sl.plannedCount || 0),
      0,
    );

    // 필요 강사 수 = ceil(계획인원 / 강사당교육생수)
    const requiredInstructors = Math.ceil(totalPlanned / traineesPerInstructor);
    if (requiredInstructors === 0) continue;

    // 배정 데이터 생성
    const assignmentsToCreate: {
      instructorId: number;
      unitScheduleId: number;
      state: 'Accepted' | 'Pending';
      isLeader: boolean;
    }[] = [];

    // 1. 주강사 1명 필수 배정
    if (mainInstructors.length > 0) {
      const mainInstructor = mainInstructors[mainIdx % mainInstructors.length];
      assignmentsToCreate.push({
        instructorId: mainInstructor.id,
        unitScheduleId: schedule.id,
        state,
        isLeader: true,
      });
      mainIdx++;
    }

    // 2. 나머지 강사 배정 (부/보조/실습)
    for (let i = 1; i < requiredInstructors; i++) {
      if (subInstructors.length > 0) {
        const subInstructor = subInstructors[subIdx % subInstructors.length];
        assignmentsToCreate.push({
          instructorId: subInstructor.id,
          unitScheduleId: schedule.id,
          state,
          isLeader: false,
        });
        subIdx++;
      } else if (mainInstructors.length > 0) {
        // 보조강사가 없으면 주강사로 대체
        const mainInstructor = mainInstructors[mainIdx % mainInstructors.length];
        assignmentsToCreate.push({
          instructorId: mainInstructor.id,
          unitScheduleId: schedule.id,
          state,
          isLeader: false,
        });
        mainIdx++;
      }
    }

    // Batch Insert
    if (assignmentsToCreate.length > 0) {
      await prisma.instructorUnitAssignment.createMany({
        data: assignmentsToCreate.map((a) => ({
          instructorId: a.instructorId,
          unitScheduleId: a.unitScheduleId,
          state: a.state,
          isLeader: a.isLeader,
        })),
        skipDuplicates: true,
      });

      if (state === 'Accepted') {
        acceptedCount += assignmentsToCreate.length;
      } else {
        pendingCount += assignmentsToCreate.length;
      }
    }
  }

  console.log('='.repeat(50));
  console.log('📊 배정 생성 결과');
  console.log('='.repeat(50));
  console.log(`  ✅ 배정 완료 (Accepted): ${acceptedCount}개`);
  console.log(`  ⏳ 대기 중 (Pending): ${pendingCount}개`);
  console.log(`  ⏭️ 건너뜀 (미래 일정): ${skippedCount}개`);
  console.log('='.repeat(50));
}

export async function runSeedTest() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          T-lecture 테스트 데이터 생성                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. 강사 데이터 생성
  await runSeedInstructors();

  // 2. 부대 데이터 생성
  await runSeedUnits();

  // 3. 배정 데이터 생성
  await createAssignments();

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              ✅ 테스트 데이터 생성 완료!                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
}

// 직접 실행 시
if (require.main === module) {
  runSeedTest()
    .catch((e) => {
      console.error('❌ 테스트 데이터 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
