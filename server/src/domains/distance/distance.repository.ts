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
      },
      create: {
        userId: Number(instructorId),
        unitId: Number(unitId),
        distance,
        duration,
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
}

export default new DistanceRepository();

// CommonJS 호환
module.exports = new DistanceRepository();
