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
  /**
   * 특정 기간 내 활성화된(Active) 배정 날짜 목록 조회
   * 날짜는 KST 기준으로 조회 (DB에 저장된 날짜도 KST 00:00 기준)
   */
  async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const cfg = await prisma.systemConfig.findUnique({ where: { key } });
    if (!cfg?.value) return defaultValue;
    const parsed = Number(cfg.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  }

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

    // 1) 최근 배정(Pending/Accepted)
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

    // 2) 최근 거절(Rejected)
    const rejectionAgg = await prisma.instructorUnitAssignment.groupBy({
      by: ['userId'],
      where: {
        userId: { in: instructorIds },
        state: 'Rejected',
        UnitSchedule: {
          date: { gte: rejectionSince },
        },
      },
      _count: { _all: true },
    });

    for (const r of rejectionAgg) {
      recentRejectionCountByInstructorId.set(r.userId, r._count._all);
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
}

export default new AssignmentRepository();

// CommonJS 호환
module.exports = new AssignmentRepository();
