// src/domains/dispatch/dispatch.repository.ts
import prisma from '../../libs/prisma';

interface DispatchCreateData {
  type: 'Temporary' | 'Confirmed';
  title?: string;
  body: string;
  userId: number;
  assignmentIds?: number[];
}

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
            unit: {
              include: { trainingLocations: true },
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

  // 확정 발송 대상 조회 (부대 단위 재발송 지원)
  async findTargetsForConfirmedDispatch() {
    // 1단계: Accepted 상태이면서 Confirmed 발송 미완료인 배정의 unitId 목록 조회
    const unsentAssignments = await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        dispatchAssignments: {
          none: { dispatch: { type: 'Confirmed' } },
        },
      },
      select: {
        UnitSchedule: { select: { unitId: true } },
      },
    });

    const unitIdsNeedingResend = [...new Set(unsentAssignments.map((a) => a.UnitSchedule.unitId))];

    if (unitIdsNeedingResend.length === 0) {
      return [];
    }

    // 2단계: 해당 부대들의 기존 Confirmed 발송 연결 삭제 (재발송을 위해)
    await prisma.dispatchAssignment.deleteMany({
      where: {
        assignment: {
          state: 'Accepted',
          UnitSchedule: { unitId: { in: unitIdsNeedingResend } },
        },
        dispatch: { type: 'Confirmed' },
      },
    });

    // 3단계: 해당 부대의 모든 Accepted 강사 반환
    return await prisma.instructorUnitAssignment.findMany({
      where: {
        state: 'Accepted',
        UnitSchedule: { unitId: { in: unitIdsNeedingResend } },
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
            unit: {
              include: {
                trainingLocations: true,
                schedules: {
                  orderBy: { date: 'asc' },
                  include: {
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
}

export default new DispatchRepository();
