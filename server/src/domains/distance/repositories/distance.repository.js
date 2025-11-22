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
   * 강사-부대 한 쌍의 거리 정보 조회
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
                unit: true,        // 필요 없으면 삭제
                instructor: true,  // 필요 없으면 삭제
            },
            });
    }

    /**
     * 여러 부대 ID에 해당하는 거리 정보 일괄 조회
     */
    async findManyByUnitIds(unitIds) {
        return prisma.instructorUnitDistance.findMany({
            where: {
                unitId: { in: unitIds },
            },
        });
    }
    /**
     * 특정 강사 기준, 거리 범위 안에 있는 부대들 조회
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
