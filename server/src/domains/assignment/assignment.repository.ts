// server/src/domains/assignment/assignment.repository.ts
import prisma from '../../libs/prisma';
import { Prisma, AssignmentState } from '@prisma/client';

interface MatchResult {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId?: number | null;
  role?: string;
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
   */
  async findScheduleCandidates(startDate: Date | string, endDate: Date | string) {
    return await prisma.unit.findMany({
      where: {
        schedules: {
          some: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        },
      },
      include: {
        trainingLocations: true,
        schedules: {
          where: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
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
    const summary: BulkCreateSummary = { requested: matchResults.length, created: 0, skipped: 0 };

    // 트랜잭션 없이 개별 처리 (upsert로 중복 방지)
    for (const match of matchResults) {
      try {
        await prisma.instructorUnitAssignment.upsert({
          where: {
            unitScheduleId_userId: {
              unitScheduleId: match.unitScheduleId,
              userId: match.instructorId,
            },
          },
          create: {
            unitScheduleId: match.unitScheduleId,
            userId: match.instructorId,
            trainingLocationId: match.trainingLocationId ?? null,
            classification: 'Temporary',
            state: 'Pending',
          },
          update: {
            // 이미 존재하면 아무것도 업데이트하지 않음 (skip)
          },
        });
        summary.created += 1;
      } catch (e) {
        // 다른 에러는 skip하고 계속 진행
        summary.skipped += 1;
      }
    }
    return summary;
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
}

export default new AssignmentRepository();

// CommonJS 호환
module.exports = new AssignmentRepository();
