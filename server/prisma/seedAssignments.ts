// server/prisma/seedAssignments.ts
// 강사 배정 데이터 생성
// 규칙:
// - 2박3일 동일 강사 배정 (TrainingPeriod 단위)
// - 주강사 1명 필수 (role=Head)
// - 참여인원 40명당 1명 추가
// - 강사의 가용일정(InstructorAvailability)에 맞게만 배정
// - 2026년 1월: 배정 (Pending/Accepted 혼합)
// - 2026년 2월: 미배정
// 실행: npx tsx prisma/seedAssignments.ts

/* eslint-disable no-console */

import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import {
  AssignmentCategory,
  AssignmentState,
  AssignmentRole,
} from '../src/generated/prisma/client.js';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 날짜 문자열 변환 (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 거리 계산 (직선거리 기반 km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { distance: number; duration: number } {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  const roadDistance = straightDistance * (1.2 + Math.random() * 0.3);
  const duration = Math.round((roadDistance / 50) * 60);

  return {
    distance: Math.round(roadDistance * 10) / 10,
    duration: Math.max(30, duration),
  };
}

interface InstructorWithAvailability {
  userId: number;
  category: string | null;
  lat: number | null;
  lng: number | null;
  user: { name: string | null };
  availableDates: Set<string>; // YYYY-MM-DD 형식
}

export async function runSeedAssignments() {
  console.log('📋 배정 데이터 생성 시작...\n');

  const startTime = Date.now();

  // 1. 데이터 로드
  console.log('[1/5] 기본 데이터 로드 중...');

  const instructorsRaw = await prisma.instructor.findMany({
    where: { user: { status: 'APPROVED' } },
    include: {
      user: true,
      availabilities: true,
    },
  });

  if (instructorsRaw.length === 0) {
    console.log('❌ 강사 데이터가 없습니다. seedUsers.ts를 먼저 실행하세요.');
    return;
  }

  // 강사 가용일정을 Set으로 변환 (빠른 조회)
  const instructors: InstructorWithAvailability[] = instructorsRaw.map((i) => ({
    userId: i.userId,
    category: i.category,
    lat: i.lat,
    lng: i.lng,
    user: i.user,
    availableDates: new Set(i.availabilities.map((a) => formatDate(a.availableOn))),
  }));

  console.log(`  ✅ 강사 ${instructors.length}명 로드됨`);

  // 주강사와 기타 강사 분리
  const mainInstructors = instructors.filter((i) => i.category === 'Main');
  const otherInstructors = instructors.filter((i) => i.category !== 'Main');
  console.log(`  - 주강사: ${mainInstructors.length}명`);
  console.log(`  - 기타: ${otherInstructors.length}명`);

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

  if (trainingPeriods.length === 0) {
    console.log('❌ TrainingPeriod 데이터가 없습니다. seedUnits.ts를 먼저 실행하세요.');
    return;
  }

  console.log(`  ✅ TrainingPeriod ${trainingPeriods.length}개 로드됨`);

  // 2. 배정 대상 분류
  console.log('\n[2/5] 배정 대상 분류 중...');

  const toAssign: typeof trainingPeriods = [];
  const toSkip: typeof trainingPeriods = [];

  for (const period of trainingPeriods) {
    if (period.schedules.length === 0) continue;

    const firstScheduleDate = period.schedules[0].date;
    if (!firstScheduleDate) continue;

    // 2026년 2월은 미배정
    if (firstScheduleDate.getUTCFullYear() === 2026 && firstScheduleDate.getUTCMonth() === 1) {
      toSkip.push(period);
    } else if (
      firstScheduleDate.getUTCFullYear() === 2026 &&
      firstScheduleDate.getUTCMonth() === 0
    ) {
      // 2026년 1월만 배정
      toAssign.push(period);
    }
  }

  console.log(`  ✅ 배정 대상 (2026년 1월): ${toAssign.length}개 TrainingPeriod`);
  console.log(`  ⏭️ 미배정 (2026년 2월): ${toSkip.length}개 TrainingPeriod`);

  // 3. 강사 가용성 기반 배정
  console.log('\n[3/5] 강사 가용성 기반 배정 중...');

  let assignmentCount = 0;
  let distanceCount = 0;
  let noAvailableInstructorCount = 0;
  let periodIndex = 0;

  for (const period of toAssign) {
    periodIndex++;
    if (period.schedules.length === 0) continue;

    const unit = period.unit;
    const scheduleDates = period.schedules.filter((s) => s.date).map((s) => formatDate(s.date!));

    if (scheduleDates.length === 0) continue;

    // 모든 일정에 가용한 강사 필터링
    const availableMainInstructors = mainInstructors.filter((i) =>
      scheduleDates.every((d) => i.availableDates.has(d)),
    );
    const availableOtherInstructors = otherInstructors.filter((i) =>
      scheduleDates.every((d) => i.availableDates.has(d)),
    );

    // 참여인원 계산
    let totalPlannedCount = 0;
    for (const sch of period.schedules) {
      for (const loc of sch.scheduleLocations) {
        totalPlannedCount += loc.plannedCount || 0;
      }
    }
    const avgPlannedCount =
      period.schedules.length > 0 ? totalPlannedCount / period.schedules.length : 50;

    // 필요 강사 수: 주강사 1 + 참여인원 40명당 1명
    const requiredCount = 1 + Math.ceil(avgPlannedCount / 40);

    // 주강사가 없으면 배정 불가
    if (availableMainInstructors.length === 0) {
      noAvailableInstructorCount++;
      continue;
    }

    // 강사 선택 (랜덤 셔플)
    const shuffledMain = [...availableMainInstructors].sort(() => Math.random() - 0.5);
    const shuffledOther = [...availableOtherInstructors].sort(() => Math.random() - 0.5);

    const actualCount = Math.min(requiredCount, shuffledMain.length + shuffledOther.length);

    const selectedInstructors = [
      ...shuffledMain.slice(0, 1), // 주강사 1명 필수
      ...shuffledOther.slice(0, actualCount - 1), // 나머지
    ].slice(0, actualCount);

    // 상태 결정 (60% Pending, 40% Accepted)
    const assignmentState: AssignmentState = Math.random() > 0.4 ? 'Pending' : 'Accepted';
    const classification: AssignmentCategory =
      assignmentState === 'Accepted' ? 'Confirmed' : 'Temporary';

    // 배정 데이터 수집 (Batch Insert용)
    const assignmentsData: {
      userId: number;
      unitScheduleId: number;
      trainingLocationId: number;
      classification: AssignmentCategory;
      state: AssignmentState;
      role: AssignmentRole;
    }[] = [];

    // 거리 데이터 수집 (Batch Insert용)
    const distanceData: {
      userId: number;
      unitId: number;
      distance: number;
      duration: number;
    }[] = [];

    const processedDistances = new Set<string>();

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
          state: assignmentState,
          role,
        });

        // 거리 데이터 (Unit당 강사당 1번만)
        const distKey = `${instructor.userId}-${unit.id}`;
        if (
          !processedDistances.has(distKey) &&
          unit.lat &&
          unit.lng &&
          instructor.lat &&
          instructor.lng
        ) {
          processedDistances.add(distKey);
          const { distance, duration } = calculateDistance(
            instructor.lat,
            instructor.lng,
            unit.lat,
            unit.lng,
          );
          distanceData.push({
            userId: instructor.userId,
            unitId: unit.id,
            distance,
            duration,
          });
        }
      }
    }

    // Batch Insert: 배정
    if (assignmentsData.length > 0) {
      await prisma.instructorUnitAssignment.createMany({
        data: assignmentsData,
        skipDuplicates: true,
      });
      assignmentCount += assignmentsData.length;
    }

    // Batch Insert: 거리
    if (distanceData.length > 0) {
      await prisma.instructorUnitDistance.createMany({
        data: distanceData.map((d) => ({
          ...d,
          preDistance: 0,
          preDuration: 0,
          needsRecalc: false,
        })),
        skipDuplicates: true,
      });
      distanceCount += distanceData.length;
    }

    if (periodIndex % 20 === 0) {
      console.log(`  📊 ${periodIndex}/${toAssign.length} TrainingPeriod 처리 완료...`);
    }
  }

  // 4. 결과 출력
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 배정 결과');
  console.log('='.repeat(50));
  console.log(`소요 시간: ${elapsedTime}초`);
  console.log(`배정 생성: ${assignmentCount}건`);
  console.log(`거리 정보: ${distanceCount}건`);
  console.log(`가용 강사 없음: ${noAvailableInstructorCount}개 TrainingPeriod`);
  console.log(`미배정 (2026년 2월): ${toSkip.length}개 TrainingPeriod`);
  console.log('='.repeat(50));

  // 상태별 통계
  const stateStats = await prisma.instructorUnitAssignment.groupBy({
    by: ['state'],
    _count: { userId: true },
  });
  console.log('📊 상태별 배정 수:');
  for (const s of stateStats) {
    console.log(`  - ${s.state}: ${s._count.userId}건`);
  }

  // 강사별 배정 수 요약
  const instructorStats = await prisma.instructorUnitAssignment.groupBy({
    by: ['userId'],
    _count: { userId: true },
  });
  const avgAssignments =
    instructorStats.length > 0
      ? (
          instructorStats.reduce((sum, s) => sum + s._count.userId, 0) / instructorStats.length
        ).toFixed(1)
      : 0;
  console.log(`📊 강사당 평균 배정: ${avgAssignments}건 (${instructorStats.length}명 배정됨)`);
  console.log('='.repeat(50));
}

// 직접 실행 시
if (require.main === module) {
  runSeedAssignments()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
