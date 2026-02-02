// server/src/domains/assignment/repositories/assignment-command.repository.ts
// 배정 생성/수정/삭제 전용 Repository (CQRS - Command)

import prisma from '../../../libs/prisma';
import { AssignmentState } from '../../../generated/prisma/client.js';
import type {
  MatchResult,
  BulkCreateSummary,
  BatchUpdateChanges,
  BatchUpdateResult,
  PenaltyReason,
  PenaltyWithReasons,
} from './types';

/**
 * 배정 생성/수정/삭제 전용 Repository
 */
class AssignmentCommandRepository {
  /**
   * 자동 배정 결과를 DB에 일괄 생성
   */
  async createAssignmentsBulk(matchResults: MatchResult[]): Promise<BulkCreateSummary> {
    const requested = matchResults.length;
    if (requested === 0) return { requested: 0, created: 0, skipped: 0 };

    // 입력 중복 제거
    const uniqueMap = new Map<string, MatchResult>();
    for (const m of matchResults) {
      const key = `${m.unitScheduleId}:${m.instructorId}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, m);
    }
    const uniqueMatches = Array.from(uniqueMap.values());

    const created = await prisma.$transaction(async (tx) => {
      const res = await tx.instructorUnitAssignment.createMany({
        data: uniqueMatches.map((match) => ({
          unitScheduleId: match.unitScheduleId,
          userId: match.instructorId,
          trainingLocationId: match.trainingLocationId ?? null,
          classification: 'Temporary',
          state: 'Pending',
          role: match.role as 'Head' | 'Supervisor' | undefined,
        })),
        skipDuplicates: true,
      });
      return res.count;
    }, {
      maxWait: 10000,  // 연결 획득 최대 10초 대기
      timeout: 20000,  // 트랜잭션 실행 최대 20초
    });

    const dedupedRequested = uniqueMatches.length;
    const inputDupRemoved = requested - dedupedRequested;
    const skipped = Math.max(dedupedRequested - created, 0) + inputDupRemoved;

    return { requested, created, skipped };
  }

  /**
   * 배정 상태 업데이트
   */
  async updateStatusByKey(instructorId: number, unitScheduleId: number, newState: string) {
    return await prisma.instructorUnitAssignment.update({
      where: {
        unitScheduleId_userId: {
          userId: Number(instructorId),
          unitScheduleId: Number(unitScheduleId),
        },
      },
      data: {
        state: newState as AssignmentState,
      },
    });
  }

  /**
   * 역할(role) 업데이트 - 관리자가 수동으로 설정
   */
  async updateRoleForUnit(
    unitId: number,
    instructorId: number,
    role: 'Head' | 'Supervisor' | null,
  ): Promise<{ updated: number }> {
    // 1. 부대 전체 배정의 role 초기화
    await prisma.instructorUnitAssignment.updateMany({
      where: {
        UnitSchedule: { trainingPeriod: { unitId } },
        state: { in: ['Pending', 'Accepted'] },
      },
      data: { role: null },
    });

    // 2. 해당 강사에게 role 부여
    let updated = 0;
    if (role) {
      const result = await prisma.instructorUnitAssignment.updateMany({
        where: {
          UnitSchedule: { trainingPeriod: { unitId } },
          userId: instructorId,
          state: { in: ['Pending', 'Accepted'] },
        },
        data: { role },
      });
      updated = result.count;
    }

    return { updated };
  }

  /**
   * 교육기간 인원고정 설정/해제
   */
  async toggleStaffLock(trainingPeriodId: number, isStaffLocked: boolean) {
    return await prisma.trainingPeriod.update({
      where: { id: trainingPeriodId },
      data: { isStaffLocked },
    });
  }

  /**
   * 스케줄의 모든 배정을 일괄 분류 업데이트
   */
  async updateClassificationBySchedule(
    unitScheduleId: number,
    classification: 'Temporary' | 'Confirmed',
  ) {
    return await prisma.instructorUnitAssignment.updateMany({
      where: {
        unitScheduleId: Number(unitScheduleId),
        state: 'Accepted',
      },
      data: {
        classification,
      },
    });
  }

  /**
   * 부대의 모든 배정을 일괄 확정 (Accepted 상태인 것만)
   */
  async updateClassificationByUnit(unitId: number, classification: 'Temporary' | 'Confirmed') {
    const periods = await prisma.trainingPeriod.findMany({
      where: { unitId: unitId },
      include: { schedules: { select: { id: true } } },
    });
    const scheduleIds = periods.flatMap((p) => p.schedules.map((s) => s.id));

    if (scheduleIds.length === 0) return { count: 0 };

    return await prisma.instructorUnitAssignment.updateMany({
      where: {
        unitScheduleId: { in: scheduleIds },
        state: 'Accepted',
      },
      data: {
        classification,
      },
    });
  }

  /**
   * 일괄 배정 업데이트 (트랜잭션)
   */
  async batchUpdateAssignments(changes: BatchUpdateChanges): Promise<BatchUpdateResult> {
    return await prisma.$transaction(async (tx) => {
      const results: BatchUpdateResult = {
        added: 0,
        removed: 0,
        rolesUpdated: 0,
        staffLocksUpdated: 0,
        statesUpdated: 0,
      };

      // 1. 배정 추가 (Pending 상태로 저장)
      if (changes.add.length > 0) {
        // ✅ N+1 문제 해결: 모든 배정과 패널티를 한 번에 조회
        const existingAssignments = await tx.instructorUnitAssignment.findMany({
          where: {
            OR: changes.add.map((a) => ({
              unitScheduleId: a.unitScheduleId,
              userId: a.instructorId,
            })),
          },
          include: {
            UnitSchedule: {
              include: { trainingPeriod: { include: { unit: { select: { name: true } } } } },
            },
          },
        });

        const instructorIds = Array.from(new Set(changes.add.map((a) => a.instructorId)));
        const penalties = await tx.instructorPenalty.findMany({
          where: { userId: { in: instructorIds } },
        });

        // Map으로 변환 (빠른 조회)
        const assignmentMap = new Map(
          existingAssignments.map((a) => [`${a.unitScheduleId}-${a.userId}`, a]),
        );
        const penaltyMap = new Map(penalties.map((p) => [p.userId, p]));

        // 패널티 업데이트 준비
        const penaltiesToDelete: number[] = [];
        const penaltiesToUpdate: Array<{
          userId: number;
          count: number;
          expiresAt: Date;
          reasons: PenaltyReason[];
        }> = [];

        // 메모리에서 처리 (DB 쿼리 없음)
        for (const a of changes.add) {
          const key = `${a.unitScheduleId}-${a.instructorId}`;
          const existingAssignment = assignmentMap.get(key);

          // 기존 배정이 Rejected였다면 패널티 사유 제거
          if (existingAssignment?.state === 'Rejected') {
            const unitName =
              existingAssignment.UnitSchedule?.trainingPeriod?.unit?.name || 'unknown';
            const dateStr = existingAssignment.UnitSchedule?.date
              ? new Date(existingAssignment.UnitSchedule.date).toISOString().split('T')[0]
              : 'unknown';

            const penalty = penaltyMap.get(a.instructorId);

            if (penalty) {
              const penaltyWithReasons = penalty as unknown as PenaltyWithReasons;
              const existingReasons: PenaltyReason[] = penaltyWithReasons.reasons || [];
              const filteredReasons = existingReasons.filter(
                (r) => !(r.unit === unitName && r.date === dateStr && r.type === '거절'),
              );

              if (penalty.count <= 1) {
                penaltiesToDelete.push(a.instructorId);
              } else {
                const penaltyDaysPerReject = 15;
                const newCount = penalty.count - 1;
                const now = new Date();
                const newExpiresAt = new Date(
                  now.getTime() + newCount * penaltyDaysPerReject * 24 * 60 * 60 * 1000,
                );

                penaltiesToUpdate.push({
                  userId: a.instructorId,
                  count: newCount,
                  expiresAt: newExpiresAt,
                  reasons: filteredReasons,
                });
              }
            }
          }
        }

        // ✅ 배치 처리: 패널티 삭제 (한 번에)
        if (penaltiesToDelete.length > 0) {
          await tx.instructorPenalty.deleteMany({
            where: { userId: { in: penaltiesToDelete } },
          });
        }

        // ✅ 배치 처리: 패널티 업데이트 (개별 - Prisma 제약)
        for (const p of penaltiesToUpdate) {
          await tx.instructorPenalty.update({
            where: { userId: p.userId },
            data: {
              count: p.count,
              expiresAt: p.expiresAt,
              reasons: p.reasons as unknown as Parameters<
                typeof tx.instructorPenalty.update
              >[0]['data']['reasons'],
            },
          });
        }

        // ✅ 배치 처리: 배정 upsert (개별 - upsert는 배치 불가)
        for (const a of changes.add) {
          await tx.instructorUnitAssignment.upsert({
            where: {
              assignment_instructor_schedule_unique: {
                unitScheduleId: a.unitScheduleId,
                userId: a.instructorId,
              },
            },
            create: {
              userId: a.instructorId,
              unitScheduleId: a.unitScheduleId,
              trainingLocationId: a.trainingLocationId,
              classification: 'Temporary',
              state: 'Pending',
            },
            update: {
              state: 'Pending',
              classification: 'Temporary',
              trainingLocationId: a.trainingLocationId,
            },
          });
          results.added++;
        }
      }

      // 2. 배정 삭제 (Canceled 처리)
      if (changes.remove.length > 0) {
        for (const r of changes.remove) {
          await tx.instructorUnitAssignment.updateMany({
            where: {
              userId: r.instructorId,
              unitScheduleId: r.unitScheduleId,
            },
            data: {
              state: 'Canceled',
            },
          });
          results.removed++;
        }
      }

      // 3. 역할 변경 (총괄/책임강사)
      if (changes.roleChanges && changes.roleChanges.length > 0) {
        for (const rc of changes.roleChanges) {
          await tx.instructorUnitAssignment.updateMany({
            where: {
              UnitSchedule: { trainingPeriod: { unitId: rc.unitId } },
              state: { in: ['Pending', 'Accepted'] },
            },
            data: { role: null },
          });

          if (rc.role) {
            await tx.instructorUnitAssignment.updateMany({
              where: {
                UnitSchedule: { trainingPeriod: { unitId: rc.unitId } },
                userId: rc.instructorId,
                state: { in: ['Pending', 'Accepted'] },
              },
              data: { role: rc.role },
            });
          }
          results.rolesUpdated++;
        }
      }

      // 4. 인원고정 변경
      if (changes.staffLockChanges && changes.staffLockChanges.length > 0) {
        for (const slc of changes.staffLockChanges) {
          const period = await tx.trainingPeriod.findFirst({
            where: { unitId: slc.unitId },
          });
          if (period) {
            await tx.trainingPeriod.update({
              where: { id: period.id },
              data: { isStaffLocked: slc.isStaffLocked },
            });
          }
          results.staffLocksUpdated++;
        }
      }

      // 5. 상태 변경 (관리자가 수동으로 Pending→Accepted 등 변경)
      if (changes.stateChanges && changes.stateChanges.length > 0) {
        for (const sc of changes.stateChanges) {
          await tx.instructorUnitAssignment.updateMany({
            where: {
              userId: sc.instructorId,
              unitScheduleId: sc.unitScheduleId,
            },
            data: {
              state: sc.state,
            },
          });
          results.statesUpdated++;
        }
      }

      return results;
    }, {
      maxWait: 10000,  // 연결 획득 최대 10초 대기
      timeout: 20000,  // 트랜잭션 실행 최대 20초
    });
  }

  /**
   * 부대의 역할(Head/Supervisor) 재계산
   */
  async recalculateRolesForUnit(unitId: number): Promise<{ updated: number }> {
    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        UnitSchedule: { trainingPeriod: { unitId } },
        state: { in: ['Pending', 'Accepted'] },
      },
      include: {
        User: {
          include: {
            instructor: true,
          },
        },
      },
    });

    if (assignments.length === 0) {
      return { updated: 0 };
    }

    // 주강사(Main) 목록 추출
    const mainInstructorMap = new Map<
      number,
      { isTeamLeader: boolean; generation: number | null }
    >();
    for (const a of assignments) {
      if (a.User?.instructor?.category === 'Main') {
        if (!mainInstructorMap.has(a.userId)) {
          mainInstructorMap.set(a.userId, {
            isTeamLeader: a.User.instructor.isTeamLeader ?? false,
            generation: a.User.instructor.generation ?? null,
          });
        }
      }
    }

    const mainInstructors = Array.from(mainInstructorMap.entries()).map(([userId, info]) => ({
      userId,
      ...info,
    }));

    // 역할 결정
    let headUserId: number | null = null;
    let roleType: 'Head' | 'Supervisor' | null = null;

    if (mainInstructors.length === 1) {
      headUserId = mainInstructors[0].userId;
      roleType = 'Supervisor';
    } else if (mainInstructors.length >= 2) {
      mainInstructors.sort((a, b) => {
        if (a.isTeamLeader !== b.isTeamLeader) {
          return a.isTeamLeader ? -1 : 1;
        }
        return (a.generation ?? 999) - (b.generation ?? 999);
      });
      headUserId = mainInstructors[0].userId;
      roleType = 'Head';
    }

    // 모든 배정의 role 업데이트
    await prisma.instructorUnitAssignment.updateMany({
      where: {
        UnitSchedule: { trainingPeriod: { unitId } },
        state: { in: ['Pending', 'Accepted'] },
      },
      data: { role: null },
    });

    let updated = 0;
    if (headUserId && roleType) {
      const result = await prisma.instructorUnitAssignment.updateMany({
        where: {
          UnitSchedule: { trainingPeriod: { unitId } },
          userId: headUserId,
          state: { in: ['Pending', 'Accepted'] },
        },
        data: { role: roleType },
      });
      updated = result.count;
    }

    return { updated };
  }
}

export const assignmentCommandRepository = new AssignmentCommandRepository();
export default assignmentCommandRepository;
