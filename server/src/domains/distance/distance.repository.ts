// server/src/domains/distance/distance.repository.ts
import prisma from '../../libs/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface DistanceData {
  distance: Decimal | number;
  duration: number;
}

class DistanceRepository {
  // 강사-부대 거리 정보 upsert
  async upsertDistance(instructorId: number, unitId: number, { distance, duration }: DistanceData) {
    return prisma.instructorUnitDistance.upsert({
      where: {
        userId_unitId: {
          userId: Number(instructorId),
          unitId: Number(unitId),
        },
      },
      update: {
        distance,
        duration,
        preDistance: null,
        preDuration: null,
        needsRecalc: false,
      },
      create: {
        userId: Number(instructorId),
        unitId: Number(unitId),
        distance,
        duration,
        needsRecalc: false,
      },
    });
  }

  // 강사-부대 한 쌍의 거리 정보 조회
  async findOne(instructorId: number, unitId: number) {
    return prisma.instructorUnitDistance.findUnique({
      where: {
        userId_unitId: {
          userId: Number(instructorId),
          unitId: Number(unitId),
        },
      },
      include: {
        unit: true,
        instructor: {
          include: { user: true },
        },
      },
    });
  }

  // 여러 부대 ID에 해당하는 거리 정보 일괄 조회
  async findManyByUnitIds(unitIds: number[]) {
    return prisma.instructorUnitDistance.findMany({
      where: {
        unitId: { in: unitIds },
      },
    });
  }

  // 특정 강사 기준, 거리 범위 안에 있는 부대들 조회
  async findByDistanceRange(instructorId: number, minDistance: number, maxDistance: number) {
    return prisma.instructorUnitDistance.findMany({
      where: {
        userId: Number(instructorId),
        distance: {
          gte: minDistance,
          lte: maxDistance,
        },
      },
      include: {
        unit: true,
      },
      orderBy: {
        distance: 'asc',
      },
    });
  }

  // 특정 부대 기준으로 거리 범위 내 강사 리스트 조회
  async findInstructorsByDistanceRange(unitId: number, minDistance: number, maxDistance: number) {
    return prisma.instructorUnitDistance.findMany({
      where: {
        unitId,
        distance: {
          gte: minDistance,
          lte: maxDistance,
        },
      },
      include: {
        instructor: {
          include: { user: true },
        },
      },
      orderBy: {
        distance: 'asc',
      },
    });
  }

  // ==================== 거리 재계산 시스템 ====================

  // 부대 추가 시: 활성 강사들에 대해 행 일괄 생성
  async createManyForUnit(unitId: number, instructorIds: number[]) {
    if (instructorIds.length === 0) return { count: 0 };

    const data = instructorIds.map((userId) => ({
      userId,
      unitId: Number(unitId),
      distance: null,
      duration: null,
      preDistance: null,
      preDuration: null,
      needsRecalc: true,
    }));

    return prisma.instructorUnitDistance.createMany({
      data,
      skipDuplicates: true,
    });
  }

  // 강사 추가 시: 스케줄 있는 부대들에 대해 행 일괄 생성
  async createManyForInstructor(instructorId: number, unitIds: number[]) {
    if (unitIds.length === 0) return { count: 0 };

    const data = unitIds.map((unitId) => ({
      userId: Number(instructorId),
      unitId,
      distance: null,
      duration: null,
      preDistance: null,
      preDuration: null,
      needsRecalc: true,
    }));

    return prisma.instructorUnitDistance.createMany({
      data,
      skipDuplicates: true,
    });
  }

  // 강사 주소 변경 시: 해당 강사의 모든 거리 무효화
  async markForRecalcByInstructor(instructorId: number) {
    // Prisma에서 self-reference update가 안되므로 Raw SQL 사용
    return prisma.$executeRaw`
      UPDATE "강사-부대 거리"
      SET "이전거리" = "거리",
          "이전걸리는시간" = "걸리는시간",
          "거리" = NULL,
          "걸리는시간" = NULL,
          "재계산필요" = true
      WHERE "userId" = ${instructorId}
    `;
  }

  // 부대 주소 변경 시: 해당 부대의 모든 거리 무효화
  async markForRecalcByUnit(unitId: number) {
    return prisma.$executeRaw`
      UPDATE "강사-부대 거리"
      SET "이전거리" = "거리",
          "이전걸리는시간" = "걸리는시간",
          "거리" = NULL,
          "걸리는시간" = NULL,
          "재계산필요" = true
      WHERE "부대id" = ${unitId}
    `;
  }

  // 재계산 필요한 쌍 조회 (스케줄 우선순위)
  async findNeedsRecalc(limit: number) {
    return prisma.$queryRaw<{ userId: number; unitId: number; earliestSchedule: Date | null }[]>`
      SELECT d."userId", d."부대id" as "unitId", MIN(s."date") as "earliestSchedule"
      FROM "강사-부대 거리" d
      LEFT JOIN "부대일정" s ON d."부대id" = s."부대id"
      WHERE d."재계산필요" = true
        AND (s."date" >= CURRENT_DATE OR s."date" IS NULL)
      GROUP BY d."userId", d."부대id"
      ORDER BY MIN(s."date") ASC NULLS LAST
      LIMIT ${limit}
    `;
  }

  // 재계산 완료 처리
  async completeRecalc(userId: number, unitId: number, distance: number, duration: number) {
    return prisma.instructorUnitDistance.update({
      where: { userId_unitId: { userId, unitId } },
      data: {
        distance,
        duration,
        preDistance: null,
        preDuration: null,
        needsRecalc: false,
      },
    });
  }

  // 유효 거리(distance ?? preDistance ?? 30km) 기반으로 강사 조회
  async findInstructorsByEffectiveDistance(
    unitId: number,
    minDistance: number,
    maxDistance: number,
  ) {
    // 기본값: 30km = 30000m (distance, preDistance 모두 null일 때)
    const DEFAULT_DISTANCE = 30000;

    return prisma.$queryRaw`
      SELECT d.*, i.*, u."id" as "userId", u."userName", u."userEmail",
             COALESCE(d."거리", d."이전거리", ${DEFAULT_DISTANCE}) as "effectiveDistance"
      FROM "강사-부대 거리" d
      JOIN "강사" i ON d."userId" = i."userId"
      JOIN "사용자" u ON i."userId" = u."id"
      WHERE d."부대id" = ${unitId}
        AND COALESCE(d."거리", d."이전거리", ${DEFAULT_DISTANCE}) >= ${minDistance}
        AND COALESCE(d."거리", d."이전거리", ${DEFAULT_DISTANCE}) <= ${maxDistance}
      ORDER BY COALESCE(d."거리", d."이전거리", ${DEFAULT_DISTANCE}) ASC
    `;
  }

  // 재계산 필요 개수 조회
  async countNeedsRecalc() {
    return prisma.instructorUnitDistance.count({
      where: { needsRecalc: true },
    });
  }
}

export default new DistanceRepository();

// CommonJS 호환
module.exports = new DistanceRepository();
