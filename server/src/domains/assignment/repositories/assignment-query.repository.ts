// server/src/domains/assignment/repositories/assignment-query.repository.ts
// 배정 조회 전용 Repository (CQRS - Query)

import prisma from '../../../libs/prisma';
import type { Prisma } from './types';

/**
 * 배정 조회 전용 Repository
 */
class AssignmentQueryRepository {
  /**
   * 강사 최근 배정/거절 통계 조회
   */
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
          select: { trainingPeriod: { select: { unitId: true } } },
        },
      },
      distinct: ['userId', 'unitScheduleId'],
    });

    // 부대별로 중복 제거하여 카운트
    const userUnitSet = new Map<number, Set<number>>();
    for (const row of rejectedRows) {
      const unitId = row.UnitSchedule?.trainingPeriod?.unitId;
      if (!unitId) continue;
      if (!userUnitSet.has(row.userId)) {
        userUnitSet.set(row.userId, new Set());
      }
      userUnitSet.get(row.userId)!.add(unitId);
    }

    for (const [userId, unitIds] of userUnitSet) {
      recentRejectionCountByInstructorId.set(userId, unitIds.size);
    }

    return { recentAssignmentCountByInstructorId, recentRejectionCountByInstructorId };
  }

  /**
   * 취소된 강사 ID 목록 조회 (스케줄별)
   */
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

  /**
   * 배정 후보 부대 조회
   * @param unitIds 특정 ID만 조회 (캐시 MISS된 ID만 조회 시 사용)
   */
  async findScheduleCandidates(
    startDate: Date | string,
    endDate: Date | string,
    options?: { unitIds?: number[] },
  ) {
    const startStr =
      typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];

    const startOfDay = new Date(`${startStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endStr}T00:00:00.000Z`);

    const units = await prisma.unit.findMany({
      where: {
        ...(options?.unitIds && options.unitIds.length > 0 ? { id: { in: options.unitIds } } : {}),
        trainingPeriods: {
          some: {
            schedules: {
              some: {
                date: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
            },
          },
        },
      },
      include: {
        trainingPeriods: {
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
            locations: {
              include: {
                scheduleLocations: true,
              },
            },
            // 해당 교육기간의 전체 스케줄 가져오기 (정렬용)
            schedules: {
              orderBy: { date: 'asc' },
              include: {
                scheduleLocations: true,
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
        },
      },
    });

    return units;
  }

  /**
   * 교육기간 ID 기반 스케줄 조회 (자동 배정용)
   */
  async findSchedulesByTrainingPeriodIds(trainingPeriodIds: number[]) {
    if (!trainingPeriodIds || trainingPeriodIds.length === 0) return [];

    return await prisma.unitSchedule.findMany({
      where: {
        trainingPeriodId: { in: trainingPeriodIds },
      },
      include: {
        trainingPeriod: {
          include: {
            unit: true,
            locations: {
              include: {
                scheduleLocations: true,
              },
            },
          },
        },
        scheduleLocations: true,
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
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * ID 기반 스케줄 조회 (자동 배정용)
   */
  async findSchedulesByIds(scheduleIds: number[]) {
    if (!scheduleIds || scheduleIds.length === 0) return [];

    return await prisma.unitSchedule.findMany({
      where: {
        id: { in: scheduleIds },
      },
      include: {
        trainingPeriod: {
          include: {
            unit: true,
            locations: {
              include: {
                scheduleLocations: true,
              },
            },
          },
        },
        scheduleLocations: true,
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
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * ID로 배정 정보 단건 조회
   */
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

  /**
   * 특정 강사의 모든 배정 목록을 조회
   */
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
        UnitSchedule: { include: { trainingPeriod: { include: { unit: true } } } },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
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
            trainingPeriod: {
              include: {
                unit: true,
                locations: true,
              },
            },
            scheduleLocations: true,
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
   * 스케줄 ID로 부대 ID 조회
   */
  async getUnitIdByScheduleId(unitScheduleId: number): Promise<number | null> {
    const schedule = await prisma.unitSchedule.findUnique({
      where: { id: unitScheduleId },
      select: { trainingPeriod: { select: { unitId: true } } },
    });
    return schedule?.trainingPeriod?.unitId ?? null;
  }

  /**
   * 여러 스케줄 ID로 부대 ID 목록 한 번에 조회 (배치)
   */
  async getUnitIdsByScheduleIds(scheduleIds: number[]): Promise<Set<number>> {
    if (!scheduleIds || scheduleIds.length === 0) return new Set();

    const schedules = await prisma.unitSchedule.findMany({
      where: { id: { in: scheduleIds } },
      select: { trainingPeriod: { select: { unitId: true } } },
    });

    const unitIds = new Set<number>();
    for (const s of schedules) {
      if (s.trainingPeriod?.unitId) {
        unitIds.add(s.trainingPeriod.unitId);
      }
    }
    return unitIds;
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
        trainingPeriods: {
          select: {
            id: true,
            isStaffLocked: true,
            locations: {
              select: {
                id: true,
                scheduleLocations: {
                  select: { actualCount: true, unitScheduleId: true },
                },
              },
            },
            schedules: {
              select: {
                id: true,
                scheduleLocations: true,
                assignments: {
                  where: { state: { in: ['Pending', 'Accepted'] } },
                  select: { userId: true, state: true, trainingLocationId: true },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 스케줄 및 부대 정보 조회 (응답 서비스용)
   */
  async getScheduleWithUnit(scheduleId: number) {
    return await prisma.unitSchedule.findUnique({
      where: { id: scheduleId },
      include: { trainingPeriod: { include: { unit: { select: { name: true } } } } },
    });
  }
}

export const assignmentQueryRepository = new AssignmentQueryRepository();
export default assignmentQueryRepository;
