// server/src/modules/distance/repositories/distance.repository.js
const prisma = require('../../libs/prisma');

class DistanceRepository {
  /**
   * 강사-부대 거리 정보 upsert
   */
    async upsertDistance(instructorId, unitId, { distance, duration }) {
        return prisma.instructorUnitDistance.upsert({
        where: {
            // ✅ [수정] Prisma 기본 복합 유니크 키 이름 사용
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
            userId: Number(instructorId), // ✅ [수정] 필드명 userId 사용
            unitId: Number(unitId),
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
            // ✅ [수정] Prisma 기본 복합 유니크 키 이름 사용
            userId_unitId: {
            userId: Number(instructorId),
            unitId: Number(unitId),
            },
        },
        include: {
            unit: true,
            instructor: { // 강사 정보 포함
                include: { user: true }
            },
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
            userId: Number(instructorId), // ✅ [수정] DB 필드명은 userId
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

    // 기존 findByDistanceRange와 반대되는 로직 추가
    async findInstructorsByDistanceRange(unitId, minDistance, maxDistance) {
        return prisma.instructorUnitDistance.findMany({
            where: {
                unitId,
                distance: {
                    gte: minDistance,
                    lte: maxDistance,
                },
            },
            include: {
                instructor: { // 강사 정보 포함 (이름, 전화번호 등)
                    include: { user: true }
                },
            },
            orderBy: {
                distance: 'asc',
            },
        });
    }
}

module.exports = new DistanceRepository();
