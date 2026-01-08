// server/prisma/seedDispatches.ts
// Dispatch(배정 메시지) 데이터 생성
// 규칙:
// - 임시 배정: Pending 상태일 때 발송 (응답 대기)
// - 확정 배정: Accepted 상태일 때 발송
// - 직책별 메시지 내용 차별화 (Head/Supervisor)
// 실행: npx tsx prisma/seedDispatches.ts

/* eslint-disable no-console */

import prisma from '../src/libs/prisma.js';

const CURRENT_DATE = new Date(Date.UTC(2026, 0, 8)); // 2026-01-08

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function runSeedDispatches() {
  console.log('📨 Dispatch(메시지) 데이터 생성 시작...\n');

  // TrainingPeriod별로 배정 그룹화
  const trainingPeriods = await prisma.trainingPeriod.findMany({
    include: {
      unit: true,
      locations: true,
      schedules: {
        include: {
          assignments: {
            include: {
              User: { include: { instructor: true } },
            },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  console.log(`📊 TrainingPeriod ${trainingPeriods.length}개 로드됨`);

  let temporaryCount = 0;
  let confirmedMemberCount = 0;
  let confirmedLeaderCount = 0;
  let dispatchAssignmentCount = 0;

  for (const period of trainingPeriods) {
    const unit = period.unit;
    const schedules = period.schedules.filter((s) => s.date);
    if (schedules.length === 0) continue;

    // 교육 기간 계산 (첫 번째 ~ 마지막 일정)
    const educationStart = schedules[0].date!;
    const educationEnd = schedules[schedules.length - 1].date!;

    // 해당 기간의 모든 배정 수집
    const allAssignments = schedules.flatMap((s) => s.assignments);
    if (allAssignments.length === 0) continue;

    // 유저별 배정 그룹화
    const assignmentsByUser = new Map<number, typeof allAssignments>();
    for (const assignment of allAssignments) {
      if (!assignmentsByUser.has(assignment.userId)) {
        assignmentsByUser.set(assignment.userId, []);
      }
      assignmentsByUser.get(assignment.userId)!.push(assignment);
    }

    // 배정 강사 명단 (확정 메시지용)
    const instructorNames = [...assignmentsByUser.entries()]
      .map(([, assignments], idx) => {
        const user = assignments[0].User;
        const category = user.instructor?.category || '';
        return `${idx + 1}. ${user.name || ''}(${category})`;
      })
      .join('\n');

    // 발송 시점: 교육 시작 2주 전
    const baseSentDate = new Date(educationStart);
    baseSentDate.setUTCDate(baseSentDate.getUTCDate() - 14);

    for (const [userId, userAssignments] of assignmentsByUser) {
      const firstAssignment = userAssignments[0];
      const user = firstAssignment.User;
      const instructor = user.instructor;
      const isHead = firstAssignment.role === 'Head';
      const isTeamLeader = instructor?.isTeamLeader || false;

      // 상태 확인
      const state = firstAssignment.state;
      const classification = firstAssignment.classification;
      const isCompleted = educationEnd < CURRENT_DATE;

      // 제목 공통
      const title = `${unit.name} : ${formatDate(educationStart)} ~ ${formatDate(educationEnd)}`;

      // 1. 임시 배정 메시지 (Pending 또는 Temporary)
      if (state === 'Pending' || classification === 'Temporary') {
        const tempBody = isHead
          ? `[임시 배정 알림 - 총괄강사]
${user.name} 강사님, 총괄강사로 임시 배정되었습니다.
- 부대명: ${unit.name}
- 광역: ${unit.wideArea || ''}
- 지역: ${unit.region || ''}
- 교육일정: ${formatDate(educationStart)} ~ ${formatDate(educationEnd)}

📋 배정 강사:
${instructorNames}

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`
          : `[임시 배정 알림]
${user.name} 강사님, 교육 일정이 임시 배정되었습니다.
- 부대명: ${unit.name}
- 광역: ${unit.wideArea || ''}
- 지역: ${unit.region || ''}
- 교육일정: ${formatDate(educationStart)} ~ ${formatDate(educationEnd)}

* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`;

        // 읽음 처리 (응답 대기 = 일부만 읽음)
        let tempReadAt: Date | null = null;
        if (Math.random() > 0.5) {
          tempReadAt = new Date(baseSentDate);
          tempReadAt.setUTCHours(tempReadAt.getUTCHours() + randomInt(1, 48));
        }

        try {
          const dispatch = await prisma.dispatch.create({
            data: {
              type: 'Temporary',
              title,
              body: tempBody,
              status: 'Sent',
              userId,
              createdAt: baseSentDate,
              readAt: tempReadAt,
            },
          });
          temporaryCount++;

          // DispatchAssignment 연결
          for (const assignment of userAssignments) {
            try {
              await prisma.dispatchAssignment.create({
                data: {
                  dispatchId: dispatch.id,
                  unitScheduleId: assignment.unitScheduleId,
                  userId: assignment.userId,
                },
              });
              dispatchAssignmentCount++;
            } catch {
              /* 중복 무시 */
            }
          }
        } catch {
          /* 오류 무시 */
        }
      }

      // 2. 확정 메시지 (Accepted 상태만)
      if (state === 'Accepted') {
        const confSentDate = new Date(baseSentDate);
        confSentDate.setUTCDate(confSentDate.getUTCDate() + randomInt(1, 3));

        // 팀장/총괄강사: 상세 정보
        // 일반 강사: 간단한 정보
        const location = period.locations[0];

        let confBody: string;
        if (isHead || isTeamLeader) {
          confBody = `[확정 배정 알림 - 총괄강사]
${user.name} 강사님, 배정이 확정되었습니다.
- 부대: ${unit.name}
- 광역: ${unit.wideArea || ''}
- 지역: ${unit.region || ''}
- 주소: ${unit.addressDetail || ''}
- 상세주소: ${unit.detailAddress || ''}
- 교육일정: ${formatDate(educationStart)} ~ ${formatDate(educationEnd)}
- 교육불가일: ${period.excludedDates?.join(', ') || '없음'}

📍 교육장소
장소명: ${location?.originalPlace || ''}
강사휴게실: ${location?.hasInstructorLounge ? 'O' : 'X'}
여자화장실: ${location?.hasWomenRestroom ? 'O' : 'X'}

📋 배정 강사
${instructorNames}

👤 부대 담당자
${period.officerName || ''} / ${period.officerPhone || ''}
수탁급식: ${period.hasCateredMeals ? 'O' : 'X'}
회관숙박: ${period.hasHallLodging ? 'O' : 'X'}`;
          confirmedLeaderCount++;
        } else {
          confBody = `[확정 배정 알림]
${user.name} 강사님, 배정이 확정되었습니다.
- 부대: ${unit.name}
- 광역: ${unit.wideArea || ''}
- 지역: ${unit.region || ''}
- 교육일정: ${formatDate(educationStart)} ~ ${formatDate(educationEnd)}

📍 교육장소: ${location?.originalPlace || ''}`;
          confirmedMemberCount++;
        }

        // 읽음 처리 (확정 = 대부분 읽음)
        let confReadAt: Date | null = null;
        if (isCompleted || Math.random() > 0.2) {
          confReadAt = new Date(confSentDate);
          confReadAt.setUTCHours(confReadAt.getUTCHours() + randomInt(1, 24));
        }

        try {
          const dispatch = await prisma.dispatch.create({
            data: {
              type: 'Confirmed',
              title,
              body: confBody,
              status: 'Sent',
              userId,
              createdAt: confSentDate,
              readAt: confReadAt,
            },
          });

          for (const assignment of userAssignments) {
            try {
              await prisma.dispatchAssignment.create({
                data: {
                  dispatchId: dispatch.id,
                  unitScheduleId: assignment.unitScheduleId,
                  userId: assignment.userId,
                },
              });
              dispatchAssignmentCount++;
            } catch {
              /* 중복 무시 */
            }
          }
        } catch {
          /* 오류 무시 */
        }
      }
    }
  }

  console.log('\n✅ Dispatch 생성 완료!');
  console.log('='.repeat(50));
  console.log('📊 생성 결과:');
  console.log(`  - 임시 배정 메시지: ${temporaryCount}개`);
  console.log(`  - 확정 메시지 (일반): ${confirmedMemberCount}개`);
  console.log(`  - 확정 메시지 (총괄): ${confirmedLeaderCount}개`);
  console.log(`  - 메시지-배정 연결: ${dispatchAssignmentCount}개`);
  console.log('='.repeat(50));
}

// 직접 실행 시
if (require.main === module) {
  runSeedDispatches()
    .catch((e) => {
      console.error('❌ 생성 실패:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
