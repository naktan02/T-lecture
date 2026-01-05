// server/prisma/seedAssignments.ts
// 배정 데이터 생성 (6월~1월 부대 전체, 2월 제외, 강사 균등 분산)
// 실행: npx tsx prisma/seedAssignments.ts

/* eslint-disable no-console */

import { PrismaClient, AssignmentState, AssignmentRole } from '@prisma/client';

const prisma = new PrismaClient();

// 현재 날짜 (2026년 1월 6일 기준)
const CURRENT_DATE = new Date(Date.UTC(2026, 0, 6));

// 2월 시작일 (이 이후 부대는 배정 제외)
const FEBRUARY_START = new Date(Date.UTC(2026, 1, 1));

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 직선 거리 계산 (km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function runSeedAssignments() {
  console.log('📋 배정 데이터 생성 시작...\n');

  // 강사 데이터 조회
  const instructors = await prisma.instructor.findMany({
    where: { profileCompleted: true },
    include: {
      user: true,
      availabilities: true,
      team: true,
    },
  });

  if (instructors.length === 0) {
    console.error('❌ 강사 데이터가 없습니다. seedUsers.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📊 강사 ${instructors.length}명 로드됨`);

  // 부대 데이터 조회 (일정 포함)
  const allUnits = await prisma.unit.findMany({
    include: {
      schedules: true,
      trainingLocations: true,
    },
    orderBy: { educationStart: 'asc' },
  });

  if (allUnits.length === 0) {
    console.error('❌ 부대 데이터가 없습니다. seedUnits.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📊 전체 부대 ${allUnits.length}개 로드됨`);

  // 6월~1월 부대만 선택 (2월 부대 제외)
  const targetUnits = allUnits.filter((u) => {
    if (!u.educationStart) return false;
    const startDate = new Date(u.educationStart);
    return startDate < FEBRUARY_START;
  });

  // 2월 부대
  const februaryUnits = allUnits.filter((u) => {
    if (!u.educationStart) return false;
    const startDate = new Date(u.educationStart);
    return startDate >= FEBRUARY_START;
  });

  console.log(`📊 배정 대상 부대: ${targetUnits.length}개 (6월~1월)`);
  console.log(`📊 미배정 부대: ${februaryUnits.length}개 (2월)`);

  // 과거/현재/미래로 분류
  const pastUnits = targetUnits.filter(
    (u) => u.educationEnd && new Date(u.educationEnd) < CURRENT_DATE,
  );
  const futureUnits = targetUnits.filter(
    (u) => u.educationStart && new Date(u.educationStart) > CURRENT_DATE,
  );
  const currentUnits = targetUnits.filter(
    (u) =>
      u.educationStart &&
      u.educationEnd &&
      new Date(u.educationStart) <= CURRENT_DATE &&
      new Date(u.educationEnd) >= CURRENT_DATE,
  );

  console.log(`  - 과거 부대 (완료): ${pastUnits.length}개`);
  console.log(`  - 진행중 부대: ${currentUnits.length}개`);
  console.log(`  - 미래 부대 (예정): ${futureUnits.length}개\n`);

  // 모든 부대를 상태별로 정렬 (균등 분산을 위해)
  // 거절/취소는 전체의 약 5%씩 = 총 10%
  const rejectedCount = Math.floor(targetUnits.length * 0.05);
  const canceledCount = Math.floor(targetUnits.length * 0.05);

  // 거절/취소용 부대 선택 (과거/미래에서 균등 선택)
  const shuffledPast = [...pastUnits].sort(() => Math.random() - 0.5);
  const shuffledFuture = [...futureUnits].sort(() => Math.random() - 0.5);

  const rejectedUnits = shuffledPast.slice(0, rejectedCount);
  const canceledUnits = shuffledFuture.slice(0, canceledCount);

  // 나머지는 Accepted
  const rejectedIds = new Set(rejectedUnits.map((u) => u.id));
  const canceledIds = new Set(canceledUnits.map((u) => u.id));

  console.log(`📊 배정 상태 분포:`);
  console.log(`  - 수락(Accepted): ${targetUnits.length - rejectedCount - canceledCount}개`);
  console.log(`  - 거절(Rejected): ${rejectedCount}개`);
  console.log(`  - 취소(Canceled): ${canceledCount}개\n`);

  // 강사별 배정 카운터 (균등 분산용)
  const instructorAssignmentCount = new Map<number, number>();
  for (const inst of instructors) {
    instructorAssignmentCount.set(inst.userId, 0);
  }

  // 팀별 강사 그룹화
  const instructorsByTeam = new Map<number, typeof instructors>();
  const instructorsNoTeam: typeof instructors = [];

  for (const inst of instructors) {
    if (inst.teamId) {
      if (!instructorsByTeam.has(inst.teamId)) {
        instructorsByTeam.set(inst.teamId, []);
      }
      instructorsByTeam.get(inst.teamId)!.push(inst);
    } else {
      instructorsNoTeam.push(inst);
    }
  }

  let assignmentCount = 0;
  let distanceCount = 0;
  let creditCount = 0;
  let penaltyCount = 0;

  // 가장 적게 배정된 강사를 우선 선택하는 함수
  function selectInstructors(candidates: typeof instructors, count: number): typeof instructors {
    // 배정 수가 적은 순으로 정렬
    const sorted = [...candidates].sort((a, b) => {
      const countA = instructorAssignmentCount.get(a.userId) || 0;
      const countB = instructorAssignmentCount.get(b.userId) || 0;
      return countA - countB;
    });
    return sorted.slice(0, count);
  }

  for (let i = 0; i < targetUnits.length; i++) {
    const unit = targetUnits[i];

    if (unit.schedules.length === 0) continue;

    // 필요 강사 수 계산 (40명당 1명)
    const totalPlanned = unit.trainingLocations.reduce(
      (sum, loc) => sum + (loc.plannedCount || 0),
      0,
    );
    const requiredInstructors = Math.max(1, Math.ceil(totalPlanned / 40));

    // 배정 상태 결정
    let assignmentState: AssignmentState;
    let assignmentType: 'accepted' | 'rejected' | 'canceled';

    if (rejectedIds.has(unit.id)) {
      assignmentState = 'Rejected';
      assignmentType = 'rejected';
    } else if (canceledIds.has(unit.id)) {
      assignmentState = 'Canceled';
      assignmentType = 'canceled';
    } else {
      assignmentState = 'Accepted';
      assignmentType = 'accepted';
    }

    // 팀 라운드로빈 방식으로 선택 (균등 분산)
    const teamId = (i % 7) + 1;
    let candidateInstructors = instructorsByTeam.get(teamId) || [];
    if (candidateInstructors.length < requiredInstructors) {
      candidateInstructors = [...candidateInstructors, ...instructorsNoTeam];
    }
    if (candidateInstructors.length < requiredInstructors) {
      candidateInstructors = [...instructors];
    }

    // 가장 적게 배정된 강사 선택
    const selectedInstructors = selectInstructors(candidateInstructors, requiredInstructors);

    // 각 일정에 대해 배정 생성
    const schedules = unit.schedules.sort(
      (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
    );
    const location = unit.trainingLocations[0];
    const startDate = unit.educationStart ? new Date(unit.educationStart) : null;

    for (let instIdx = 0; instIdx < selectedInstructors.length; instIdx++) {
      const instructor = selectedInstructors[instIdx];
      const role: AssignmentRole | null = instIdx === 0 ? 'Head' : null;

      for (const schedule of schedules) {
        try {
          await prisma.instructorUnitAssignment.create({
            data: {
              userId: instructor.userId,
              unitScheduleId: schedule.id,
              trainingLocationId: location?.id || null,
              classification: 'Confirmed',
              state: assignmentState,
              role: role,
            },
          });
          assignmentCount++;

          // 강사별 카운터 증가
          const current = instructorAssignmentCount.get(instructor.userId) || 0;
          instructorAssignmentCount.set(instructor.userId, current + 1);
        } catch {
          // 중복 무시
        }
      }

      // 거리 데이터 생성 (현실적인 한국 이동거리 기준)
      // 가까운 거리(60%): 15-40km
      // 중거리(30%): 40-80km
      // 장거리(10%): 80-120km
      const rand = Math.random();
      let distance: number;
      if (rand < 0.6) {
        distance = 15 + Math.random() * 25; // 15~40km
      } else if (rand < 0.9) {
        distance = 40 + Math.random() * 40; // 40~80km
      } else {
        distance = 80 + Math.random() * 40; // 80~120km
      }

      // 소요시간: 평균 시속 40km 기준 (도로 상황 반영)
      const duration = Math.round((distance / 40) * 60);

      try {
        await prisma.instructorUnitDistance.upsert({
          where: { userId_unitId: { userId: instructor.userId, unitId: unit.id } },
          update: {
            distance: parseFloat(distance.toFixed(1)),
            duration: duration,
          },
          create: {
            userId: instructor.userId,
            unitId: unit.id,
            distance: parseFloat(distance.toFixed(1)),
            duration: duration,
          },
        });
        distanceCount++;
      } catch {
        // 무시
      }
    }

    // 크레딧/패널티 생성 (취소/거절의 50%)
    if (assignmentType === 'canceled' && i % 2 === 0 && selectedInstructors.length > 0) {
      const inst = selectedInstructors[0];
      try {
        await prisma.instructorPriorityCredit.create({
          data: {
            instructorId: inst.userId,
            credits: 1,
            reasons: [{ unit: unit.name, date: formatDate(startDate || new Date()), type: '취소' }],
          },
        });
        creditCount++;
      } catch {
        // 이미 존재
      }
    }

    if (assignmentType === 'rejected' && i % 2 === 0 && selectedInstructors.length > 0) {
      const inst = selectedInstructors[0];
      const expiresAt = new Date(CURRENT_DATE);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      try {
        await prisma.instructorPenalty.create({
          data: {
            userId: inst.userId,
            count: 1,
            expiresAt: expiresAt,
            reasons: [{ unit: unit.name, date: formatDate(startDate || new Date()), type: '거절' }],
          },
        });
        penaltyCount++;
      } catch {
        // 이미 존재
      }
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  📊 ${i + 1}/${targetUnits.length} 부대 처리 완료...`);
    }
  }

  // 강사별 배정 분포 확인
  const counts = Array.from(instructorAssignmentCount.values());
  const minAssign = Math.min(...counts);
  const maxAssign = Math.max(...counts);
  const avgAssign = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);

  console.log(`\n✅ 배정 데이터 생성 완료!`);
  console.log('='.repeat(50));
  console.log(`📊 생성 결과:`);
  console.log(`  - 배정 레코드: ${assignmentCount}개`);
  console.log(`  - 거리 데이터: ${distanceCount}개`);
  console.log(`  - 우선배정 크레딧: ${creditCount}개`);
  console.log(`  - 강사 패널티: ${penaltyCount}개`);
  console.log('='.repeat(50));
  console.log(`📊 강사별 배정 분포:`);
  console.log(`  - 최소: ${minAssign}건 / 최대: ${maxAssign}건 / 평균: ${avgAssign}건`);
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
