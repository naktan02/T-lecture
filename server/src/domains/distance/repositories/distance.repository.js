// server/src/modules/distance/repositories/distance.repository.js
const prisma = require('../../../libs/prisma');

class DistanceRepository {
  /**
   * 강사-부대 거리 정보 upsert
   */
    async upsertDistance(instructorId, unitId, { distance, duration }) {
        return prisma.instructorUnitDistance.upsert({
        where: {
            instructor_unit_distance_pk: {
            instructorId,
            unitId,
            },
        },
        update: {
            distance,
            duration,
        },
        create: {
            instructorId,
            unitId,
            distance,
            duration,
        },
        });
    }

    /**
     * 특정 강사-부대 거리 조회
     */
    async findOne(instructorId, unitId) {
        return prisma.instructorUnitDistance.findUnique({
        where: {
            instructor_unit_distance_pk: {
            instructorId,
            unitId,
            },
        },
        include: {
            instructor: true,
            unit: true,
        },
        });
    }

    /**
     * 특정 강사의 특정 범위 내 부대 거리 목록 조회
     */
    async findByDistanceRange(instructorId, minDistance, maxDistance) {
        return prisma.instructorUnitDistance.findMany({
        where: {
            instructorId,
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
}

module.exports = new DistanceRepository();
