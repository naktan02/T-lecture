// server/prisma/seedDispatches.ts
// Dispatch(배정 메시지) 데이터 생성
// 실행: npx tsx prisma/seedDispatches.ts

/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURRENT_DATE = new Date(Date.UTC(2026, 0, 6)); // 2026-01-06

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function runSeedDispatches() {
  console.log('📨 Dispatch(메시지) 데이터 생성 시작...\n');

  // 배정된 모든 부대의 첫 번째 일정 조회 (그룹화)
  const assignments = await prisma.instructorUnitAssignment.findMany({
    include: {
      User: true,
      UnitSchedule: {
        include: {
          unit: true,
        },
      },
    },
    orderBy: [{ unitScheduleId: 'asc' }, { userId: 'asc' }],
  });

  if (assignments.length === 0) {
    console.error('❌ 배정 데이터가 없습니다. seedAssignments.ts를 먼저 실행하세요.');
    return;
  }
  console.log(`📊 배정 레코드 ${assignments.length}개 로드됨`);

  // 부대(UnitSchedule 기준) 별로 그룹화
  const assignmentsByUnit = new Map<number, typeof assignments>();
  for (const assignment of assignments) {
    const unitId = assignment.UnitSchedule.unitId;
    if (!assignmentsByUnit.has(unitId)) {
      assignmentsByUnit.set(unitId, []);
    }
    assignmentsByUnit.get(unitId)!.push(assignment);
  }
  console.log(`📊 부대 ${assignmentsByUnit.size}개에 대해 메시지 생성\n`);

  let temporaryCount = 0;
  let confirmedCount = 0;
  let dispatchAssignmentCount = 0;

  for (const [, unitAssignments] of assignmentsByUnit) {
    const firstAssignment = unitAssignments[0];
    const unit = firstAssignment.UnitSchedule.unit;
    const educationStart = unit?.educationStart;
    const educationEnd = unit?.educationEnd;

    if (!educationStart || !educationEnd) continue;

    // 임시 배정 메시지 생성 (모든 배정에 대해)
    // 발송 시점: 교육 시작 2주 전
    const tempSentDate = new Date(educationStart);
    tempSentDate.setDate(tempSentDate.getDate() - 14);

    // 각 강사에게 개별 메시지 발송
    const uniqueUserIds = [...new Set(unitAssignments.map((a) => a.userId))];

    for (const userId of uniqueUserIds) {
      const userAssignments = unitAssignments.filter((a) => a.userId === userId);
      const userFirstAssignment = userAssignments[0];
      const user = userFirstAssignment.User;

      // 임시 배정 메시지
      const tempTitle = `${unit?.name || '부대'} : ${educationStart.toISOString().split('T')[0]} ~ ${educationEnd.toISOString().split('T')[0]}`;
      const tempBody = `[임시 배정 알림]\n${user.name} 강사님, 교육 일정이 임시 배정되었습니다.\n- 부대명: ${unit?.name}\n- 광역: ${unit?.wideArea}\n- 지역: ${unit?.region}\n* 하단의 버튼을 통해 [수락] 또는 [거절]을 선택해주세요.`;

      // 읽음 처리: 완료된 배정은 모두 읽음, 미래 배정은 일부 읽음
      const isCompleted = educationEnd < CURRENT_DATE;
      let tempReadAt: Date | null = null;
      if (isCompleted || Math.random() > 0.3) {
        tempReadAt = new Date(tempSentDate);
        tempReadAt.setHours(tempReadAt.getHours() + randomInt(1, 48));
      }

      try {
        const tempDispatch = await prisma.dispatch.create({
          data: {
            type: 'Temporary',
            title: tempTitle,
            body: tempBody,
            status: 'Sent',
            userId: userId,
            createdAt: tempSentDate,
            readAt: tempReadAt,
          },
        });
        temporaryCount++;

        // DispatchAssignment 연결
        for (const assignment of userAssignments) {
          try {
            await prisma.dispatchAssignment.create({
              data: {
                dispatchId: tempDispatch.id,
                unitScheduleId: assignment.unitScheduleId,
                userId: assignment.userId,
              },
            });
            dispatchAssignmentCount++;
          } catch {
            // 중복 무시
          }
        }

        // 확정 메시지 (Accepted 상태만)
        if (userFirstAssignment.state === 'Accepted') {
          const confSentDate = new Date(tempSentDate);
          confSentDate.setDate(confSentDate.getDate() + randomInt(1, 3)); // 임시 배정 후 1~3일

          const confTitle = `${unit?.name || '부대'} : ${educationStart.toISOString().split('T')[0]} ~ ${educationEnd.toISOString().split('T')[0]}`;
          const confBody = `[확정 배정 알림]\n${user.name} 강사님, 배정이 확정되었습니다.\n- 부대: ${unit?.name}\n- 주소: ${unit?.addressDetail}`;

          // 읽음 처리
          let confReadAt: Date | null = null;
          if (isCompleted || Math.random() > 0.2) {
            confReadAt = new Date(confSentDate);
            confReadAt.setHours(confReadAt.getHours() + randomInt(1, 24));
          }

          const confDispatch = await prisma.dispatch.create({
            data: {
              type: 'Confirmed',
              title: confTitle,
              body: confBody,
              status: 'Sent',
              userId: userId,
              createdAt: confSentDate,
              readAt: confReadAt,
            },
          });
          confirmedCount++;

          // DispatchAssignment 연결
          for (const assignment of userAssignments) {
            try {
              await prisma.dispatchAssignment.create({
                data: {
                  dispatchId: confDispatch.id,
                  unitScheduleId: assignment.unitScheduleId,
                  userId: assignment.userId,
                },
              });
              dispatchAssignmentCount++;
            } catch {
              // 중복 무시
            }
          }
        }
      } catch {
        // 오류 무시
      }
    }
  }

  console.log(`\n✅ Dispatch 생성 완료!`);
  console.log('='.repeat(50));
  console.log(`📊 생성 결과:`);
  console.log(`  - 임시 배정 메시지: ${temporaryCount}개`);
  console.log(`  - 확정 메시지: ${confirmedCount}개`);
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
