// server/prisma/seedtest.ts
// 테스트 데이터 시드 (강사 + 부대 + 추가교육 + 배정)
// 실행: npx tsx prisma/seedtest.ts

/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import { runSeedInstructors } from './seedInstructors.js';
import { runSeedUnits } from './seedUnits.js';
import {
  AssignmentCategory,
  AssignmentState,
  AssignmentRole,
} from '../src/generated/prisma/client.js';

// 날짜 문자열 변환 (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
): AssignmentState | null {
  const { thisSunday, nextSunday } = weekInfo;

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

// 추가 교육 생성 (이미 지난 부대에 대해)
async function createAdditionalTrainingPeriods() {
  console.log('\n📚 추가 교육 생성 시작...\n');

  const today = new Date();

  // 이미 지난 일정이 있는 부대 중 일부에 추가 교육 생성
  const pastUnits = await prisma.unit.findMany({
    where: {
      trainingPeriods: {
        some: {
          schedules: {
            some: {
              date: { lt: today },
            },
          },
        },
      },
    },
    include: {
      trainingPeriods: {
        include: {
          schedules: { orderBy: { date: 'desc' }, take: 1 },
          locations: true,
        },
      },
    },
    take: 10, // 10개 부대에 추가 교육 생성
  });

  console.log(`  📅 추가 교육 대상 부대: ${pastUnits.length}개\n`);

  let createdCount = 0;

  for (const unit of pastUnits) {
    const existingPeriod = unit.trainingPeriods[0];
    if (!existingPeriod || existingPeriod.schedules.length === 0) continue;

    // 기존 교육 종료일 이후 1주일 후에 추가 교육 시작
    const lastSchedule = existingPeriod.schedules[0];
    if (!lastSchedule.date) continue;

    const additionalStartDate = new Date(lastSchedule.date);
    additionalStartDate.setUTCDate(additionalStartDate.getUTCDate() + 7);

    // 추가 교육: 2일간
    const additionalEndDate = new Date(additionalStartDate);
    additionalEndDate.setUTCDate(additionalStartDate.getUTCDate() + 1);

    try {
      // 추가 교육 TrainingPeriod 생성
      const additionalPeriod = await prisma.trainingPeriod.create({
        data: {
          unitId: unit.id,
          name: '추가교육',
          workStartTime: existingPeriod.workStartTime,
          workEndTime: existingPeriod.workEndTime,
          lunchStartTime: existingPeriod.lunchStartTime,
          lunchEndTime: existingPeriod.lunchEndTime,
          officerName: existingPeriod.officerName,
          officerPhone: existingPeriod.officerPhone,
          officerEmail: existingPeriod.officerEmail,
          isStaffLocked: false,
          hasCateredMeals: existingPeriod.hasCateredMeals,
          hasHallLodging: existingPeriod.hasHallLodging,
          allowsPhoneBeforeAfter: existingPeriod.allowsPhoneBeforeAfter,
        },
      });

      // 교육장소 복사
      const newLocation = await prisma.trainingLocation.create({
        data: {
          trainingPeriodId: additionalPeriod.id,
          originalPlace: existingPeriod.locations[0]?.originalPlace || '추가교육장소',
          hasInstructorLounge: true,
          hasWomenRestroom: true,
        },
      });

      // 일정 및 ScheduleLocation 생성
      const currentDate = new Date(additionalStartDate);
      while (currentDate <= additionalEndDate) {
        const schedule = await prisma.unitSchedule.create({
          data: {
            trainingPeriodId: additionalPeriod.id,
            date: new Date(currentDate),
          },
        });

        await prisma.scheduleLocation.create({
          data: {
            unitScheduleId: schedule.id,
            trainingLocationId: newLocation.id,
            plannedCount: randomInt(30, 80),
            actualCount: null, // actualCount는 비워둠 (fallback 테스트용)
          },
        });

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      createdCount++;
      console.log(`  ✅ ${unit.name}: 추가교육 생성 (${formatDate(additionalStartDate)} ~ ${formatDate(additionalEndDate)})`);
    } catch (error) {
      console.error(`  ❌ ${unit.name}: 추가교육 생성 실패`);
    }
  }

  console.log(`\n  ✅ 총 ${createdCount}개 추가 교육 생성 완료\n`);
}

// 배정 데이터 생성
async function createAssignments() {
  console.log('\n📋 배정 데이터 생성 시작...\n');

  const today = new Date();
  const weekInfo = getWeekInfo(today);

  console.log(`  📅 오늘: ${formatDate(today)}`);
  console.log(`  📅 이번주: ${formatDate(weekInfo.thisMonday)} ~ ${formatDate(weekInfo.thisSunday)}`);
  console.log(`  📅 다음주: ${formatDate(weekInfo.nextMonday)} ~ ${formatDate(weekInfo.nextSunday)}\n`);

  // 강사당 교육생 수 설정 조회
  const traineesConfig = await prisma.systemConfig.findUnique({
    where: { key: 'TRAINEES_PER_INSTRUCTOR' },
  });
  const traineesPerInstructor = traineesConfig?.value ? parseInt(traineesConfig.value, 10) : 36;
  console.log(`  👥 강사당 교육생 수: ${traineesPerInstructor}명`);

  // 강사 목록 조회 (가용일정 포함)
  const instructorsRaw = await prisma.instructor.findMany({
    where: { user: { status: 'APPROVED' } },
    include: {
      user: true,
      availabilities: true,
    },
  });

  // 강사 가용일정을 Set으로 변환
  const instructors = instructorsRaw.map((i) => ({
    userId: i.userId,
    category: i.category,
    lat: i.lat,
    lng: i.lng,
    user: i.user,
    availableDates: new Set(i.availabilities.map((a) => formatDate(a.availableOn))),
  }));

  // 주강사와 기타 강사 분리
  const mainInstructors = instructors.filter((i) => i.category === 'Main');
  const otherInstructors = instructors.filter((i) => i.category !== 'Main');

  console.log(`  👨‍🏫 주강사: ${mainInstructors.length}명`);
  console.log(`  👨‍🏫 기타 강사: ${otherInstructors.length}명\n`);

  // TrainingPeriod별로 일정 그룹화
  const trainingPeriods = await prisma.trainingPeriod.findMany({
    include: {
      unit: true,
      locations: true,
      schedules: {
        include: { scheduleLocations: true },
        orderBy: { date: 'asc' },
      },
    },
  });

  console.log(`  📅 총 TrainingPeriod 수: ${trainingPeriods.length}개\n`);

  let acceptedCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;
  let noInstructorCount = 0;

  for (const period of trainingPeriods) {
    if (period.schedules.length === 0) continue;

    // 모든 일정의 날짜 목록
    const scheduleDates = period.schedules
      .filter((s) => s.date)
      .map((s) => formatDate(s.date!));

    if (scheduleDates.length === 0) continue;

    // 첫 번째 일정 날짜로 상태 결정
    const firstDate = period.schedules[0].date;
    if (!firstDate) continue;

    const state = getAssignmentState(firstDate, weekInfo);

    if (state === null) {
      skippedCount += period.schedules.length;
      continue;
    }

    // 해당 기간의 모든 일정에 가용한 강사 필터링
    const availableMainInstructors = mainInstructors.filter((i) =>
      scheduleDates.every((d) => i.availableDates.has(d)),
    );
    const availableOtherInstructors = otherInstructors.filter((i) =>
      scheduleDates.every((d) => i.availableDates.has(d)),
    );

    // 가용한 주강사가 없으면 모든 강사에서 선택
    const effectiveMainInstructors =
      availableMainInstructors.length > 0 ? availableMainInstructors : mainInstructors;
    const effectiveOtherInstructors =
      availableOtherInstructors.length > 0 ? availableOtherInstructors : otherInstructors;

    if (effectiveMainInstructors.length === 0) {
      noInstructorCount++;
      continue;
    }

    // 참여인원 계산 (일일 평균)
    let totalPlannedCount = 0;
    for (const sch of period.schedules) {
      for (const loc of sch.scheduleLocations) {
        totalPlannedCount += loc.plannedCount || 0;
      }
    }
    const avgPlannedCount =
      period.schedules.length > 0 ? totalPlannedCount / period.schedules.length : 50;

    // 필요 강사 수 = ceil(계획인원 / 강사당교육생수)
    const requiredCount = Math.max(1, Math.ceil(avgPlannedCount / traineesPerInstructor));

    // 강사 선택 (랜덤 셔플)
    const shuffledMain = [...effectiveMainInstructors].sort(() => Math.random() - 0.5);
    const shuffledOther = [...effectiveOtherInstructors].sort(() => Math.random() - 0.5);

    // 주강사 1명 + 나머지
    const selectedInstructors = [
      ...shuffledMain.slice(0, 1),
      ...shuffledOther.slice(0, requiredCount - 1),
    ].slice(0, requiredCount);

    // classification 결정
    const classification: AssignmentCategory = state === 'Accepted' ? 'Confirmed' : 'Temporary';

    // 배정 데이터 수집
    const assignmentsData: {
      userId: number;
      unitScheduleId: number;
      trainingLocationId: number;
      classification: AssignmentCategory;
      state: AssignmentState;
      role: AssignmentRole;
    }[] = [];

    // 모든 일정에 동일 강사 배정 (2박3일 동일 강사)
    for (const schedule of period.schedules) {
      const location = schedule.scheduleLocations[0];
      if (!location) continue;

      for (let i = 0; i < selectedInstructors.length; i++) {
        const instructor = selectedInstructors[i];
        const role: AssignmentRole = i === 0 ? 'Head' : 'Supervisor';

        assignmentsData.push({
          userId: instructor.userId,
          unitScheduleId: schedule.id,
          trainingLocationId: location.trainingLocationId,
          classification,
          state,
          role,
        });
      }
    }

    // Batch Insert
    if (assignmentsData.length > 0) {
      try {
        await prisma.instructorUnitAssignment.createMany({
          data: assignmentsData,
          skipDuplicates: true,
        });

        if (state === 'Accepted') {
          acceptedCount += assignmentsData.length;
        } else {
          pendingCount += assignmentsData.length;
        }
      } catch (error) {
        console.error(`  ❌ 배정 생성 실패: ${period.unit.name}`);
      }
    }
  }

  console.log('='.repeat(50));
  console.log('📊 배정 생성 결과');
  console.log('='.repeat(50));
  console.log(`  ✅ 배정 완료 (Accepted): ${acceptedCount}개`);
  console.log(`  ⏳ 대기 중 (Pending): ${pendingCount}개`);
  console.log(`  ⏭️ 건너뜀 (미래 일정): ${skippedCount}개`);
  console.log(`  ⚠️ 강사 없음: ${noInstructorCount}개 TrainingPeriod`);
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

  // 3. 추가 교육 생성 (이미 지난 부대에 대해)
  await createAdditionalTrainingPeriods();

  // 4. 배정 데이터 생성
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
