// server/src/domains/assignment/assignment.repository.ts
import prisma from '../../libs/prisma';
import { Prisma, AssignmentState } from '@prisma/client';

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
    // KST 기준 날짜로 변환 (UTC 기준으로 -9시간 → KST 00:00 = UTC 전날 15:00)
    const startKST = new Date(startDate);
    startKST.setUTCHours(-9, 0, 0, 0); // KST 00:00 = UTC -9시간

    const endKST = new Date(endDate);
    endKST.setUTCHours(23 - 9, 59, 59, 999); // KST 23:59:59 = UTC 14:59:59

    return await prisma.unit.findMany({
      where: {
        schedules: {
          some: {
            date: {
              gte: startKST,
              lte: endKST,
            },
          },
        },
      },
      include: {
        trainingLocations: true,
        schedules: {
          where: {
            date: {
              gte: startKST,
              lte: endKST,
            },
          },
          orderBy: { date: 'asc' },
          include: {
            assignments: {
              where: { state: { in: ['Pending', 'Accepted'] } },
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
                // 확정 메시지 발송 여부 확인용
                messageAssignments: {
                  select: {
                    message: {
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
   * 스케줄 배정 막기/해제
   */
  async updateScheduleBlock(unitScheduleId: number, isBlocked: boolean) {
    return await prisma.unitSchedule.update({
      where: { id: unitScheduleId },
      data: { isBlocked },
    });
  }

  /**
   * 부대의 모든 스케줄 일괄 배정막기/해제
   */
  async bulkBlockByUnitId(unitId: number, isBlocked: boolean) {
    return await prisma.unitSchedule.updateMany({
      where: { unitId: unitId },
      data: { isBlocked },
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
        messageAssignments: {
          include: {
            message: true,
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
      include: {
        trainingLocations: {
          select: { id: true, instructorsNumbers: true },
        },
        schedules: {
          select: {
            id: true,
            isBlocked: true,
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
}

export default new AssignmentRepository();

// CommonJS 호환
module.exports = new AssignmentRepository();
