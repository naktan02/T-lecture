// server/prisma/seedAssignments.ts
// 강사 배정 및 거리 데이터 생성
// 규칙:
// - 2박3일 동일 강사 배정 (TrainingPeriod 단위)
// - 주강사 1명 필수 (role=Head)
// - 참여인원 40명당 1명 추가
// - 2025년: 모두 Accepted
// - 2026년 1월 1~7일: Accepted (완료)
// - 2026년 1월 8일~: Pending/Accepted 혼합 (예정)
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

// 기준일: 2026-01-08
const CURRENT_DATE = new Date(Date.UTC(2026, 0, 8));

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 거리 계산 (직선거리 기반 km, 현실적인 값)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { distance: number; duration: number } {
  // Haversine 공식 간소화
  const R = 6371; // 지구 반지름 km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;

  // 도로 거리는 직선거리의 1.2~1.5배
  const roadDistance = straightDistance * (1.2 + Math.random() * 0.3);
  // 평균 시속 50km로 가정
  const duration = Math.round((roadDistance / 50) * 60);

  return {
    distance: Math.round(roadDistance * 10) / 10,
    duration: Math.max(30, duration), // 최소 30분
  };
}

export async function runSeedAssignments() {
  console.log('📋 배정 데이터 생성 시작...\n');

  const startTime = Date.now();

  // 1. 데이터 로드
  console.log('[1/4] 기본 데이터 로드 중...');

  const instructors = await prisma.instructor.findMany({
    where: { user: { status: 'APPROVED' } },
    include: {
      user: true,
      availabilities: true,
    },
  });
  if (instructors.length === 0) {
    console.log('❌ 강사 데이터가 없습니다.');
    return;
  }
  console.log(`  ✅ 강사 ${instructors.length}명 로드됨`);

  // 주강사만 필터 (Head 역할 후보)
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
  console.log(`  ✅ TrainingPeriod ${trainingPeriods.length}개 로드됨`);

  // 2. 배정 대상 분류
  console.log('\n[2/4] 배정 대상 분류 중...');

  const toAssign: typeof trainingPeriods = []; // 배정 대상
  const toSkip: typeof trainingPeriods = []; // 미배정 (2026년 2월)

  for (const period of trainingPeriods) {
    if (period.schedules.length === 0) continue;

    const firstScheduleDate = period.schedules[0].date;
    if (!firstScheduleDate) continue;

    // 2026년 2월은 미배정
    if (firstScheduleDate.getUTCFullYear() === 2026 && firstScheduleDate.getUTCMonth() === 1) {
      toSkip.push(period);
    } else {
      toAssign.push(period);
    }
  }

  console.log(`  ✅ 배정 대상: ${toAssign.length}개 TrainingPeriod`);
  console.log(`  ⏭️ 미배정 (2026년 2월): ${toSkip.length}개 TrainingPeriod`);

  // 3. 배정 및 거리 생성
  console.log('\n[3/4] 배정 및 거리 데이터 생성 중...');
  let assignmentCount = 0;
  let distanceCount = 0;
  let periodIndex = 0;

  for (const period of toAssign) {
    periodIndex++;
    if (period.schedules.length === 0) continue;

    const unit = period.unit;
    const firstSchedule = period.schedules[0];
    const firstDate = firstSchedule.date!;

    // 참여인원 계산 (첫 번째 일정의 모든 장소 합산)
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
    const actualCount = Math.min(requiredCount, mainInstructors.length + otherInstructors.length);

    // 상태 결정
    let assignmentState: AssignmentState;
    let classification: AssignmentCategory;

    if (firstDate.getUTCFullYear() === 2025) {
      // 2025년: 모두 완료
      assignmentState = 'Accepted';
      classification = 'Confirmed';
    } else if (firstDate.getUTCFullYear() === 2026 && firstDate.getUTCMonth() === 0) {
      // 2026년 1월
      if (firstDate.getUTCDate() <= 7) {
        // 1~7일: 완료
        assignmentState = 'Accepted';
        classification = 'Confirmed';
      } else {
        // 8일 이후: 예정/응답대기 혼합
        if (Math.random() > 0.4) {
          assignmentState = 'Pending';
          classification = 'Temporary';
        } else {
          assignmentState = 'Accepted';
          classification = 'Confirmed';
        }
      }
    } else {
      // 기타: 기본값
      assignmentState = 'Pending';
      classification = 'Temporary';
    }

    // 강사 선택 (3일 연속 같은 강사)
    const shuffledMain = [...mainInstructors].sort(() => Math.random() - 0.5);
    const shuffledOther = [...otherInstructors].sort(() => Math.random() - 0.5);

    const selectedInstructors = [
      ...shuffledMain.slice(0, 1), // 주강사 1명 필수
      ...shuffledOther.slice(0, actualCount - 1), // 나머지
    ].slice(0, actualCount);

    // TrainingPeriod의 모든 일정에 동일 강사 배정
    for (const schedule of period.schedules) {
      const location = schedule.scheduleLocations[0];
      if (!location) continue;

      for (let i = 0; i < selectedInstructors.length; i++) {
        const instructor = selectedInstructors[i];
        const role: AssignmentRole = i === 0 ? 'Head' : 'Supervisor';

        try {
          await prisma.instructorUnitAssignment.create({
            data: {
              userId: instructor.userId,
              unitScheduleId: schedule.id,
              trainingLocationId: location.trainingLocationId,
              classification,
              state: assignmentState,
              role,
            },
          });
          assignmentCount++;
        } catch {
          // 중복 무시
        }

        // 거리 데이터 생성 (Unit 당 한 번)
        if (unit.lat && unit.lng && instructor.lat && instructor.lng) {
          const existing = await prisma.instructorUnitDistance.findUnique({
            where: {
              userId_unitId: { userId: instructor.userId, unitId: unit.id },
            },
          });

          if (!existing) {
            const { distance, duration } = calculateDistance(
              instructor.lat,
              instructor.lng,
              unit.lat,
              unit.lng,
            );

            await prisma.instructorUnitDistance.create({
              data: {
                userId: instructor.userId,
                unitId: unit.id,
                distance,
                duration,
                preDistance: 0,
                preDuration: 0,
                needsRecalc: false,
              },
            });
            distanceCount++;
          }
        }
      }
    }

    if (periodIndex % 100 === 0) {
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
