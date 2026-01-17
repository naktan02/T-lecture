// src/domains/dispatch/dispatch.repository.ts
import prisma from '../../libs/prisma';
import { DispatchCreateData } from '../../types/dispatch.types';

class DispatchRepository {
  // ==========================================
  // 배정 발송 관련 메서드 (임시/확정)
  // ==========================================

  // 임시 발송 대상 조회 (날짜 범위 필터링)
  async findTargetsForTemporaryDispatch(startDate?: string, endDate?: string) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Pending',
        dispatchAssignments: {
          none: {
            dispatch: { type: 'Temporary' },
          },
        },
        // 날짜 범위 필터링
        ...(startDate || endDate
          ? {
              UnitSchedule: {
                date: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        User: {
          include: {
            instructor: {
              include: {
                virtues: {
                  include: { virtue: true },
                },
              },
            },
          },
        },
        UnitSchedule: {
          include: {
            // NOTE: unit은 이제 trainingPeriod를 통해 접근
            trainingPeriod: {
              include: {
                unit: true,
                locations: true,
                schedules: {
                  orderBy: { date: 'asc' },
                  include: {
                    scheduleLocations: {
                      include: { location: true },
                    },
                    assignments: {
                      where: { state: 'Pending' },
                      include: { User: { include: { instructor: true } } },
                    },
                  },
                },
              },
            },
            assignments: {
              where: { state: 'Pending' },
              include: { User: { include: { instructor: true } } },
            },
          },
        },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }

  // 확정 발송 대상 조회 (부대가 확정 상태인 경우만, 날짜 범위 필터링)
  async findTargetsForConfirmedDispatch(startDate?: string, endDate?: string) {
    console.log('[DispatchRepo] findTargetsForConfirmedDispatch:', { startDate, endDate });

    // 날짜 범위 조건
    const dateFilter =
      startDate && endDate
        ? {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {};

    // 1단계: 확정 상태인 부대 찾기 (TrainingPeriod 기반)
    // 확정 조건: 해당 TrainingPeriod의 모든 배정이 Accepted (Pending 없음)
    const confirmedPeriods = await prisma.trainingPeriod.findMany({
      where: {
        schedules: {
          some: {
            ...dateFilter, // 날짜 범위 필터
            assignments: {
              some: { state: 'Accepted' }, // 최소 1명 수락
            },
          },
        },
        // Pending이 없는 period만
        NOT: {
          schedules: {
            some: {
              ...dateFilter, // 날짜 범위 필터
              assignments: {
                some: { state: 'Pending' },
              },
            },
          },
        },
      },
      select: { id: true, unitId: true },
    });

    console.log(
      '[DispatchRepo] Confirmed periods:',
      confirmedPeriods.length,
      confirmedPeriods.map((p) => p.id),
    );

    const confirmedPeriodIds = confirmedPeriods.map((p) => p.id);

    if (confirmedPeriodIds.length === 0) {
      console.log('[DispatchRepo] No confirmed periods found');
      return [];
    }

    // 2단계: 확정 period 중에서 Confirmed 발송 미완료인 배정 조회
    const unsentAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        UnitSchedule: { trainingPeriodId: { in: confirmedPeriodIds } },
        dispatchAssignments: {
          none: { dispatch: { type: 'Confirmed' } },
        },
      },
      select: {
        UnitSchedule: { select: { trainingPeriodId: true } },
      },
    });

    console.log('[DispatchRepo] Unsent assignments:', unsentAssignments.length);

    const periodIdsNeedingResend = [
      ...new Set(unsentAssignments.map((a) => a.UnitSchedule.trainingPeriodId)),
    ];

    console.log('[DispatchRepo] Period IDs needing resend:', periodIdsNeedingResend);

    if (periodIdsNeedingResend.length === 0) {
      console.log('[DispatchRepo] All confirmed assignments already have Confirmed dispatch');
      return [];
    }

    // 3단계: 해당 period들의 기존 Confirmed 발송 연결 삭제 (재발송을 위해)
    await prisma.dispatchAssignment.deleteMany({
      where: {
        assignment: {
          state: 'Accepted',
          UnitSchedule: { trainingPeriodId: { in: periodIdsNeedingResend } },
        },
        dispatch: { type: 'Confirmed' },
      },
    });

    // 4단계: 해당 period의 모든 Accepted 강사 반환
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        UnitSchedule: { trainingPeriodId: { in: periodIdsNeedingResend } },
      },
      include: {
        User: {
          include: {
            instructor: {
              include: {
                virtues: {
                  include: { virtue: true },
                },
              },
            },
          },
        },
        UnitSchedule: {
          include: {
            trainingPeriod: {
              include: {
                unit: true,
                locations: true,
                schedules: {
                  orderBy: { date: 'asc' },
                  include: {
                    scheduleLocations: {
                      include: { location: true },
                    },
                    assignments: {
                      where: { state: 'Accepted' },
                      include: {
                        User: {
                          include: {
                            instructor: {
                              include: {
                                virtues: {
                                  include: { virtue: true },
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
            },
            assignments: {
              where: { state: 'Accepted' },
              include: { User: true },
            },
          },
        },
      },
    });
  }

  // 임시, 확정 발송 생성 (단순화: Dispatch에 userId 직접 저장)
  async createDispatchesBulk(dispatchDataList: DispatchCreateData[]) {
    return await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const data of dispatchDataList) {
        // 발송 생성 (userId 포함)
        const dispatch = await tx.dispatch.create({
          data: {
            type: data.type,
            title: data.title ?? null,
            body: data.body,
            status: 'Sent',
            userId: data.userId,
            createdAt: new Date(),
          },
        });

        // 배정(Assignment) 연결
        if (data.assignmentIds && data.assignmentIds.length > 0) {
          await tx.dispatchAssignment.createMany({
            data: data.assignmentIds.map((unitScheduleId) => ({
              dispatchId: dispatch.id,
              userId: data.userId,
              unitScheduleId: unitScheduleId,
            })),
          });
        }
        count++;
      }
      return count;
    });
  }

  // 내 발송 목록 조회 (단순화: Dispatch 직접 조회)
  async findMyDispatches(
    userId: number,
    options: {
      type?: 'Temporary' | 'Confirmed';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { type, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where = {
      userId: Number(userId),
      ...(type && { type }),
    };

    console.log('[DispatchRepo] findMyDispatches where:', where);

    const [dispatches, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: {
          assignments: {
            where: { userId: Number(userId) },
            include: {
              assignment: {
                select: {
                  unitScheduleId: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dispatch.count({ where }),
    ]);

    console.log('[DispatchRepo] findMyDispatches result:', {
      total,
      dispatchCount: dispatches.length,
    });

    return { dispatches, total, page, limit };
  }

  // 발송 읽음 처리 (단순화: Dispatch 직접 업데이트)
  async markAsRead(userId: number, dispatchId: number) {
    return await prisma.dispatch.update({
      where: {
        id: Number(dispatchId),
        userId: Number(userId), // 본인 발송만 업데이트 가능
      },
      data: { readAt: new Date() },
    });
  }

  // 특정 유저-TrainingPeriod의 모든 배정 조회 (날짜 필터 없이 전체)
  async findAllAssignmentsForUserInUnit(userId: number, unitId: number) {
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        userId,
        UnitSchedule: {
          trainingPeriod: {
            unitId,
          },
        },
        state: 'Pending', // Pending 상태만
      },
      include: {
        UnitSchedule: {
          select: {
            date: true,
          },
        },
      },
      orderBy: {
        UnitSchedule: { date: 'asc' },
      },
    });
  }
}

export default new DispatchRepository();
