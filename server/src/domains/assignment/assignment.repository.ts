// server/src/domains/assignment/assignment.repository.ts
import prisma from '../../libs/prisma';
import { Prisma, AssignmentState } from '../../generated/prisma/client.js';

interface MatchResult {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId?: number | null;
  role?: string | null;
}

interface BulkCreateSummary {
  requested: number;
  created: number;
  skipped: number;
}

interface PrismaError extends Error {
  code?: string;
}

/**
 * 강사 배정 관련 DB 접근 전담 Repository
 */
class AssignmentRepository {
  async getInstructorRecentStats(
    instructorIds: number[],
    assignmentSince: Date,
    rejectionSince: Date,
  ): Promise<{
    recentAssignmentCountByInstructorId: Map<number, number>;
    recentRejectionCountByInstructorId: Map<number, number>;
  }> {
    const recentAssignmentCountByInstructorId = new Map<number, number>();
    const recentRejectionCountByInstructorId = new Map<number, number>();

    if (!instructorIds || instructorIds.length === 0) {
      return { recentAssignmentCountByInstructorId, recentRejectionCountByInstructorId };
    }

    // 1) 최근 배정(Pending/Accepted) - 일정별 카운트
    const assignmentAgg = await prisma.instructorUnitAssignment.groupBy({
      by: ['userId'],
      where: {
        userId: { in: instructorIds },
        state: { in: ['Pending', 'Accepted'] },
        UnitSchedule: {
          date: { gte: assignmentSince },
        },
      },
      _count: { _all: true },
    });

    for (const r of assignmentAgg) {
      recentAssignmentCountByInstructorId.set(r.userId, r._count._all);
    }

    // 2) 최근 거절(Rejected) - 부대별 카운트 (+1 per unit, not per schedule)
    // 같은 부대의 여러 일정 거절 = +1 패널티
    const rejectedRows = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId: { in: instructorIds },
        state: 'Rejected',
        UnitSchedule: {
          date: { gte: rejectionSince },
        },
      },
      select: {
        userId: true,
        UnitSchedule: {
          select: { unitId: true },
        },
      },
      distinct: ['userId', 'unitScheduleId'],
    });

    // 부대별로 중복 제거하여 카운트
    const userUnitSet = new Map<number, Set<number>>();
    for (const row of rejectedRows) {
      const unitId = row.UnitSchedule?.unitId;
      if (!unitId) continue;
      if (!userUnitSet.has(row.userId)) {
        userUnitSet.set(row.userId, new Set());
      }
      userUnitSet.get(row.userId)!.add(unitId);
    }

    // 부대 개수 = 패널티
    for (const [userId, unitIds] of userUnitSet) {
      recentRejectionCountByInstructorId.set(userId, unitIds.size);
    }

    return { recentAssignmentCountByInstructorId, recentRejectionCountByInstructorId };
  }

  async findCanceledInstructorIdsByScheduleIds(
    scheduleIds: number[],
  ): Promise<Map<number, Set<number>>> {
    const map = new Map<number, Set<number>>();
    if (!scheduleIds || scheduleIds.length === 0) return map;
    const rows = await prisma.instructorUnitAssignment.findMany({
      where: {
        unitScheduleId: { in: scheduleIds },
        state: 'Canceled',
      },
      select: {
        unitScheduleId: true,
        userId: true,
      },
    });

    for (const r of rows) {
      if (!map.has(r.unitScheduleId)) map.set(r.unitScheduleId, new Set<number>());
      map.get(r.unitScheduleId)!.add(r.userId);
    }

    return map;
  }

  async findScheduleCandidates(startDate: Date | string, endDate: Date | string) {
    // 입력: "YYYY-MM-DD" 형식의 문자열 또는 Date 객체
    const startStr =
      typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    // UTC 자정 기준으로 조회 (DB 저장 형식과 동일)
    const startOfDay = new Date(`${startStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endStr}T00:00:00.000Z`);

    return await prisma.unit.findMany({
      where: {
        schedules: {
          some: {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
      include: {
        trainingLocations: true,
        schedules: {
          // 부대의 모든 스케줄을 가져옴 (날짜 필터 제거)
          // 부대가 선택된 기간에 포함되면 해당 부대의 전체 일정을 표시
          orderBy: { date: 'asc' },
          include: {
            assignments: {
              where: { state: { in: ['Pending', 'Accepted', 'Rejected'] } },
              include: {
                User: {
                  include: {
                    instructor: {
                      include: {
                        team: true,
                      },
                    },
                  },
                },
                // 확정 발송 여부 확인용
                dispatchAssignments: {
                  select: {
                    dispatch: {
                      select: { type: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        educationStart: 'asc',
      },
    });
  }

  // 자동 배정 결과를 DB에 일괄 생성
  async createAssignmentsBulk(matchResults: MatchResult[]): Promise<BulkCreateSummary> {
    const requested = matchResults.length;
    if (requested === 0) return { requested: 0, created: 0, skipped: 0 };

    // (A) 입력 중복 제거: 같은 (unitScheduleId, instructorId)가 여러 번 들어오면
    //     createMany 전에 dedupe해서 불필요한 work 및 결과 혼선을 줄인다.
    const uniqueMap = new Map<string, MatchResult>();
    for (const m of matchResults) {
      const key = `${m.unitScheduleId}:${m.instructorId}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, m);
    }
    const uniqueMatches = Array.from(uniqueMap.values());

    // createMany는 기본적으로 update를 하지 않으므로
    // 기존 row(Rejected/Canceled 등)를 절대 건드리지 않음.
    // skipDuplicates는 동일 PK가 이미 있으면 그 row는 스킵.
    // 트랜잭션으로 묶어서 실패 시 0건 저장(부분 저장 방지).
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
      // Prisma createMany의 count는 "실제로 insert된 row 수"
      return res.count;
    });
    // skipped는 (dedupe 이후 요청 수) - (실제 insert 수) + (dedupe로 제거된 중복 수)
    const dedupedRequested = uniqueMatches.length;
    const inputDupRemoved = requested - dedupedRequested;
    const skipped = Math.max(dedupedRequested - created, 0) + inputDupRemoved;

    return { requested, created, skipped };
  }

  // 배정 상태 업데이트
  async updateAssignmentStatusCondition(
    instructorId: number,
    unitScheduleId: number,
    updateData: Prisma.InstructorUnitAssignmentUpdateInput,
  ) {
    return await prisma.instructorUnitAssignment.updateMany({
      where: {
        userId: Number(instructorId),
        unitScheduleId: Number(unitScheduleId),
        classification: { not: 'Confirmed' },
        state: { not: 'Canceled' },
      },
      data: updateData,
    });
  }

  // 특정 기간 내 활성화된 배정 날짜 목록 조회
  async findActiveAssignmentsDate(instructorId: number, startDate: Date, endDate: Date) {
    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        userId: Number(instructorId),
        state: { in: ['Pending', 'Accepted'] },
        UnitSchedule: {
          date: { gte: startDate, lte: endDate },
        },
      },
      select: {
        UnitSchedule: { select: { date: true } },
      },
    });

    return assignments.map((a) => a.UnitSchedule.date);
  }

  // ID로 배정 정보 단건 조회
  async findAssignmentByKey(instructorId: number, unitScheduleId: number) {
    return await prisma.instructorUnitAssignment.findUnique({
      where: {
        unitScheduleId_userId: {
          userId: Number(instructorId),
          unitScheduleId: Number(unitScheduleId),
        },
      },
      include: {
        User: true,
      },
    });
  }

  // 특정 강사의 모든 배정 목록을 조회
  async findAllByInstructorId(
    instructorId: number,
    whereCondition: Prisma.InstructorUnitAssignmentWhereInput = {},
  ) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        userId: Number(instructorId),
        ...whereCondition,
      },
      include: {
        UnitSchedule: { include: { unit: true } },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }

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
   * 부대 전체 배정의 role을 먼저 초기화한 후 해당 강사에게만 role 부여
   */
  async updateRoleForUnit(
    unitId: number,
    instructorId: number,
    role: 'Head' | 'Supervisor' | null,
  ): Promise<{ updated: number }> {
    // 1. 부대 전체 배정의 role 초기화
    await prisma.instructorUnitAssignment.updateMany({
      where: {
        UnitSchedule: { unitId },
        state: { in: ['Pending', 'Accepted'] },
      },
      data: { role: null },
    });

    // 2. 해당 강사에게 role 부여
    let updated = 0;
    if (role) {
      const result = await prisma.instructorUnitAssignment.updateMany({
        where: {
          UnitSchedule: { unitId },
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
   * 부대 인원고정 설정/해제
   */
  async toggleStaffLock(unitId: number, isStaffLocked: boolean) {
    return await prisma.unit.update({
      where: { id: unitId },
      data: { isStaffLocked },
    });
  }

  /**
   * 강사 배정 응답 (수락/거절)
   * Pending 상태에서만 응답 가능
   */
  async respondToAssignment(
    userId: number,
    unitScheduleId: number,
    response: 'Accepted' | 'Rejected',
  ) {
    return await prisma.instructorUnitAssignment.update({
      where: {
        unitScheduleId_userId: {
          userId: Number(userId),
          unitScheduleId: Number(unitScheduleId),
        },
        state: 'Pending', // Pending 상태에서만 응답 가능
      },
      data: {
        state: response,
      },
    });
  }

  /**
   * 내 배정 목록 조회 (임시/확정 포함, 메시지 포함)
   */
  async getMyAssignments(userId: number) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        userId: Number(userId),
        state: { in: ['Pending', 'Accepted', 'Rejected'] },
      },
      include: {
        UnitSchedule: {
          include: {
            unit: {
              include: {
                trainingLocations: true,
              },
            },
            assignments: {
              where: { state: { in: ['Pending', 'Accepted'] } },
              include: {
                User: {
                  include: {
                    instructor: {
                      include: { team: true },
                    },
                  },
                },
              },
            },
          },
        },
        TrainingLocation: true,
        dispatchAssignments: {
          include: {
            dispatch: true,
          },
        },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }

  /**
   * 특정 스케줄의 모든 배정 상태 조회 (관리자용)
   * 필요 인원 대비 수락된 인원 수 확인용
   */
  async getAssignmentsByScheduleId(unitScheduleId: number) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        unitScheduleId: Number(unitScheduleId),
      },
      include: {
        User: {
          include: {
            instructor: {
              include: { team: true },
            },
          },
        },
      },
    });
  }

  /**
   * 배정 분류(classification) 업데이트
   * Temporary -> Confirmed 또는 그 반대로 변경
   */
  async updateClassification(
    unitScheduleId: number,
    userId: number,
    classification: 'Temporary' | 'Confirmed',
  ) {
    return await prisma.instructorUnitAssignment.update({
      where: {
        unitScheduleId_userId: {
          userId: Number(userId),
          unitScheduleId: Number(unitScheduleId),
        },
      },
      data: {
        classification,
      },
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
   * 스케줄 ID로 부대 ID 조회
   */
  async getUnitIdByScheduleId(unitScheduleId: number): Promise<number | null> {
    const schedule = await prisma.unitSchedule.findUnique({
      where: { id: unitScheduleId },
      select: { unitId: true },
    });
    return schedule?.unitId ?? null;
  }

  /**
   * 부대의 모든 스케줄과 배정 정보 조회 (장소별 필요 인원 포함)
   */
  async getUnitWithAssignments(unitId: number) {
    return await prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        name: true,
        isStaffLocked: true,
        trainingLocations: {
          select: { id: true, actualCount: true },
        },
        schedules: {
          select: {
            id: true,
            assignments: {
              where: { state: { in: ['Pending', 'Accepted'] } },
              select: { userId: true, state: true, trainingLocationId: true },
            },
          },
        },
      },
    });
  }

  /**
   * 부대의 모든 배정을 일괄 확정 (Accepted 상태인 것만)
   */
  async updateClassificationByUnit(unitId: number, classification: 'Temporary' | 'Confirmed') {
    // 부대의 모든 스케줄 ID 조회
    const schedules = await prisma.unitSchedule.findMany({
      where: { unitId: unitId },
      select: { id: true },
    });
    const scheduleIds = schedules.map((s) => s.id);

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
   * - add: 새 배정 생성
   * - remove: 배정 삭제 (또는 Canceled 처리)
   * - roleChanges: 역할 변경 (총괄/책임강사)
   * - staffLockChanges: 인원고정 변경
   */
  async batchUpdateAssignments(changes: {
    add: Array<{ unitScheduleId: number; instructorId: number; trainingLocationId: number | null }>;
    remove: Array<{ unitScheduleId: number; instructorId: number }>;
    roleChanges?: Array<{
      unitId: number;
      instructorId: number;
      role: 'Head' | 'Supervisor' | null;
    }>;
    staffLockChanges?: Array<{
      unitId: number;
      isStaffLocked: boolean;
    }>;
  }) {
    return await prisma.$transaction(async (tx) => {
      const results = {
        added: 0,
        removed: 0,
        rolesUpdated: 0,
        staffLocksUpdated: 0,
      };

      // 1. 배정 추가 (Pending 상태로 저장)
      // 기존 Rejected/Canceled 배정이 있으면 Pending으로 업데이트 (upsert)
      if (changes.add.length > 0) {
        for (const a of changes.add) {
          // 기존 배정 상태 확인 (Rejected였던 경우 패널티 사유 제거용)
          const existingAssignment = await tx.instructorUnitAssignment.findUnique({
            where: {
              assignment_instructor_schedule_unique: {
                unitScheduleId: a.unitScheduleId,
                userId: a.instructorId,
              },
            },
            include: {
              UnitSchedule: {
                include: { unit: { select: { name: true } } },
              },
            },
          });

          // 기존 배정이 Rejected였다면 패널티 사유 제거
          if (existingAssignment?.state === 'Rejected') {
            const unitName = existingAssignment.UnitSchedule?.unit?.name || 'unknown';
            const dateStr = existingAssignment.UnitSchedule?.date
              ? new Date(existingAssignment.UnitSchedule.date).toISOString().split('T')[0]
              : 'unknown';

            // 패널티에서 해당 사유 제거
            const penalty = await tx.instructorPenalty.findUnique({
              where: { userId: a.instructorId },
            });

            if (penalty) {
              const existingReasons =
                ((penalty as any)?.reasons as Array<{
                  unit: string;
                  date: string;
                  type: string;
                }>) || [];
              const filteredReasons = existingReasons.filter(
                (r) => !(r.unit === unitName && r.date === dateStr && r.type === '거절'),
              );

              if (penalty.count <= 1) {
                // 마지막 패널티면 삭제
                await tx.instructorPenalty.delete({
                  where: { userId: a.instructorId },
                });
              } else {
                // 남은 패널티가 있으면 count 감소 및 사유 업데이트
                // 만료일 재계산 (남은 패널티 수에 맞게)
                const penaltyDaysPerReject = 15; // 시스템 설정값 (하드코딩 임시)
                const newCount = penalty.count - 1;
                const now = new Date();
                const newExpiresAt = new Date(
                  now.getTime() + newCount * penaltyDaysPerReject * 24 * 60 * 60 * 1000,
                );

                await tx.instructorPenalty.update({
                  where: { userId: a.instructorId },
                  data: {
                    count: { decrement: 1 },
                    expiresAt: newExpiresAt,
                    reasons: filteredReasons,
                  } as any, // Prisma generate 후 제거
                });
              }
            }
          }

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
              state: 'Pending', // Rejected/Canceled -> Pending으로 재활성화
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
          // 해당 부대의 모든 role 초기화
          await tx.instructorUnitAssignment.updateMany({
            where: {
              UnitSchedule: { unitId: rc.unitId },
              state: { in: ['Pending', 'Accepted'] },
            },
            data: { role: null },
          });

          // 선택한 강사에게 role 부여
          if (rc.role) {
            await tx.instructorUnitAssignment.updateMany({
              where: {
                UnitSchedule: { unitId: rc.unitId },
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
          await tx.unit.update({
            where: { id: slc.unitId },
            data: { isStaffLocked: slc.isStaffLocked },
          });
          results.staffLocksUpdated++;
        }
      }

      return results;
    });
  }

  /**
   * 부대의 역할(Head/Supervisor) 재계산
   * - 부대 전체 Accepted/Pending 배정 기준으로 주강사 수 판단
   * - 주강사 1명: 책임강사(Supervisor)
   * - 주강사 2명+: 팀장 > 연차 높은 사람 = 총괄강사(Head)
   */
  async recalculateRolesForUnit(unitId: number): Promise<{ updated: number }> {
    // 1. 해당 부대의 모든 활성 배정 조회 (Pending/Accepted)
    const assignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        UnitSchedule: { unitId },
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

    // 2. 주강사(Main) 목록 추출 (중복 제거 - 동일 강사가 여러 일정에 배정될 수 있음)
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

    // 3. 역할 결정
    let headUserId: number | null = null;
    let roleType: 'Head' | 'Supervisor' | null = null;

    if (mainInstructors.length === 1) {
      // 주강사 1명 → 책임강사(Supervisor)
      headUserId = mainInstructors[0].userId;
      roleType = 'Supervisor';
    } else if (mainInstructors.length >= 2) {
      // 주강사 2명+ → 팀장 우선, 없으면 연차 높은 사람(generation 낮은 값)
      mainInstructors.sort((a, b) => {
        if (a.isTeamLeader !== b.isTeamLeader) {
          return a.isTeamLeader ? -1 : 1;
        }
        return (a.generation ?? 999) - (b.generation ?? 999);
      });
      headUserId = mainInstructors[0].userId;
      roleType = 'Head';
    }

    // 4. 모든 배정의 role 업데이트
    // 먼저 모두 null로 초기화
    await prisma.instructorUnitAssignment.updateMany({
      where: {
        UnitSchedule: { unitId },
        state: { in: ['Pending', 'Accepted'] },
      },
      data: { role: null },
    });

    // Head/Supervisor 대상자만 role 설정
    let updated = 0;
    if (headUserId && roleType) {
      const result = await prisma.instructorUnitAssignment.updateMany({
        where: {
          UnitSchedule: { unitId },
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

export default new AssignmentRepository();

// CommonJS 호환
module.exports = new AssignmentRepository();
