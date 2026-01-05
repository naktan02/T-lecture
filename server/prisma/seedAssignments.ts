// server/prisma/seedAssignments.ts
// 배정 데이터 400세트 생성 + 거리 데이터
// 실행: npx tsx prisma/seedAssignments.ts

/* eslint-disable no-console */

import { PrismaClient, AssignmentState, AssignmentRole } from '@prisma/client';

const prisma = new PrismaClient();

// 현재 날짜 (2026년 1월 5일 기준)
const CURRENT_DATE = new Date(Date.UTC(2026, 0, 5));

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 직선 거리 계산 (km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
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
  const units = await prisma.unit.findMany({
    include: {
      schedules: true,
      trainingLocations: true,
    },
    orderBy: { educationStart: 'asc' },
  });

  if (units.length === 0) {
    console.error('❌ 부대 데이터가 없습니다. seedUnits.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📊 부대 ${units.length}개 로드됨`);

  // 부대를 과거/현재/미래로 분류
  const pastUnits = units.filter((u) => u.educationEnd && new Date(u.educationEnd) < CURRENT_DATE);
  const futureUnits = units.filter(
    (u) => u.educationStart && new Date(u.educationStart) > CURRENT_DATE,
  );
  const currentUnits = units.filter(
    (u) =>
      u.educationStart &&
      u.educationEnd &&
      new Date(u.educationStart) <= CURRENT_DATE &&
      new Date(u.educationEnd) >= CURRENT_DATE,
  );

  console.log(`  - 과거 부대: ${pastUnits.length}개`);
  console.log(`  - 진행중 부대: ${currentUnits.length}개`);
  console.log(`  - 미래 부대: ${futureUnits.length}개`);

  // 배정 대상 선택: 완료 280(과거), 예정 80(미래), 거절/취소 40(혼합)
  const selectedUnits: typeof units = [];

  // 완료 (과거 부대에서 280개)
  const completedUnits = pastUnits.slice(0, 280);
  selectedUnits.push(...completedUnits);

  // 예정 (미래 부대에서 80개)
  const scheduledUnits = futureUnits.slice(0, 80);
  selectedUnits.push(...scheduledUnits);

  // 거절/취소 (남은 부대에서 40개)
  const remainingUnits = [...pastUnits.slice(280), ...futureUnits.slice(80)];
  const rejectedCanceledUnits = remainingUnits.slice(0, 40);
  selectedUnits.push(...rejectedCanceledUnits);

  console.log(`📊 배정 대상 부대 ${selectedUnits.length}개 선택됨`);
  console.log(`  - 완료(과거): ${completedUnits.length}개`);
  console.log(`  - 예정(미래): ${scheduledUnits.length}개`);
  console.log(`  - 거절/취소: ${rejectedCanceledUnits.length}개\\n`);

  let assignmentCount = 0;
  let distanceCount = 0;
  let creditCount = 0;
  let penaltyCount = 0;

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

  for (let i = 0; i < selectedUnits.length; i++) {
    const unit = selectedUnits[i];

    if (unit.schedules.length === 0) continue;

    // 필요 강사 수 계산 (40명당 1명)
    const totalPlanned = unit.trainingLocations.reduce(
      (sum, loc) => sum + (loc.plannedCount || 0),
      0,
    );
    const requiredInstructors = Math.max(1, Math.ceil(totalPlanned / 40));

    // 배정 상태 결정 (인덱스 기반 - 완료 280개, 예정 80개, 거절 20개, 취소 20개)
    let assignmentState: AssignmentState;
    let assignmentType: 'completed' | 'scheduled' | 'rejected' | 'canceled';
    const startDate = unit.educationStart ? new Date(unit.educationStart) : null;

    if (i < completedUnits.length) {
      // 완료 (과거 부대)
      assignmentState = 'Accepted';
      assignmentType = 'completed';
    } else if (i < completedUnits.length + scheduledUnits.length) {
      // 예정 (미래 부대)
      assignmentState = 'Accepted';
      assignmentType = 'scheduled';
    } else if (i < completedUnits.length + scheduledUnits.length + 20) {
      // 거절
      assignmentState = 'Rejected';
      assignmentType = 'rejected';
    } else {
      // 취소
      assignmentState = 'Canceled';
      assignmentType = 'canceled';
    }

    // 같은 팀 강사 우선 선택
    const teamId = Math.floor(Math.random() * 7) + 1;
    let candidateInstructors = instructorsByTeam.get(teamId) || [];
    if (candidateInstructors.length < requiredInstructors) {
      candidateInstructors = [...candidateInstructors, ...instructorsNoTeam];
    }
    if (candidateInstructors.length < requiredInstructors) {
      candidateInstructors = [...instructors];
    }

    // 셔플
    candidateInstructors = candidateInstructors.sort(() => Math.random() - 0.5);
    const selectedInstructors = candidateInstructors.slice(0, requiredInstructors);

    // 각 일정에 대해 배정 생성
    const schedules = unit.schedules.sort(
      (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime(),
    );
    const location = unit.trainingLocations[0];

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
        } catch {
          // 중복 무시
        }
      }

      // 거리 데이터 생성
      if (instructor.lat && instructor.lng && unit.lat && unit.lng) {
        const distance = calculateDistance(instructor.lat, instructor.lng, unit.lat, unit.lng);
        const duration = Math.round(distance * 1.5); // 1km당 약 1.5분

        try {
          await prisma.instructorUnitDistance.upsert({
            where: { userId_unitId: { userId: instructor.userId, unitId: unit.id } },
            update: {},
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

    if ((i + 1) % 50 === 0) {
      console.log(`  📊 ${i + 1}/${selectedUnits.length} 부대 처리 완료...`);
    }
  }

  console.log(`\n✅ 배정 데이터 생성 완료!`);
  console.log('='.repeat(50));
  console.log(`📊 생성 결과:`);
  console.log(`  - 배정 레코드: ${assignmentCount}개`);
  console.log(`  - 거리 데이터: ${distanceCount}개`);
  console.log(`  - 우선배정 크레딧: ${creditCount}개`);
  console.log(`  - 강사 패널티: ${penaltyCount}개`);
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
