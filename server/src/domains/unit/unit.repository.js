//server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {

  async create(data) {
    const { trainingLocations, schedules, ...unitData } = data;

    return prisma.unit.create({
      data: {
        ...unitData,
        ...(trainingLocations && trainingLocations.length
          ? { trainingLocations: { create: trainingLocations } }
          : {}),
        ...(schedules && schedules.length
          ? { schedules: { create: schedules } }
          : {}),
      },
      include: {
        trainingLocations: true,
        schedules: true,
      },
    });
  }

  /** 전체 부대 목록 조회 */
  async findAll() {
    return prisma.unit.findMany({
      include: {
        trainingLocations: true,
        schedules: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  /** 특정 부대 상세 조회 */
  async findById(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: true,
      },
    });
  }

  /**
   * 부대 정보 수정
   * - Unit 기본 정보만 수정
   * - 교육장소/일정 수정은 별도 로직으로 분리
   */
  async update(id, data) {
    const { trainingLocations, schedules, ...unitData } = data;

    // trainingLocations, schedules는 여기서 다루지 않고
    // 별도 서비스/레포에서 $transaction으로 처리하는 걸 권장
    return prisma.unit.update({
      where: { id: Number(id) },
      data: unitData,
    });
  }

  /** 부대 삭제 */
  async delete(id) {
    return prisma.unit.delete({
      where: { id: Number(id) },
    });
  }

  /**
   * 📌 거리 배치용: 다가오는 부대 일정 가져오기
   * - UnitSchedule.date 기준으로 오늘 이후 일정만
   * - 가까운 날짜 순으로 정렬
   */
  async findUpcomingSchedules(limit = 50) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return prisma.unitSchedule.findMany({
      where: {
        date: {
          gte: today,
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: limit,
      include: {
        unit: true, // unit.addressDetail, unit.lat/lng 필요
      },
    });
  }

  /** 위/경도 갱신 */
  async updateCoords(unitId, lat, lng) {
    return prisma.unit.update({
      where: { id: Number(unitId) },
      data: { lat, lng },
    });
  }
}

module.exports = new UnitRepository();
