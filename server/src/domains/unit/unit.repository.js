//server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  /**
   * [신규] 부대 단건 DB 삽입 (Insert)
   */
  async insertOneUnit(data) {
    return prisma.unit.create({
      data,
      include: {
        trainingLocations: true,
        schedules: true,
      },
    });
  }

  /**
   * [신규] 부대 다건 일괄 삽입 (Bulk Insert with Transaction)
   */
  async insertManyUnits(dataArray) {
    return prisma.$transaction(
      dataArray.map((data) =>
        prisma.unit.create({
          data,
        })
      )
    );
  }

  /**
   * [변경] 필터 조건으로 부대 목록 및 개수 조회
   * 이미 조립된 where 조건을 받아서 처리
   */
async findUnitsByFilterAndCount({ skip, take, where }) {
    const [total, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        // 필요한 필드만 select 하거나 전체 반환
      }),
    ]);

    return { total, units };
  }

  /**
   * [변경] 부대 상세 정보(하위 데이터 포함) 조회
   * - 기존: findUnitDetail
   * - 변경: findUnitWithRelations (관계 데이터도 같이 가져옴을 명시)
   */
  async findUnitWithRelations(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: {
          orderBy: { date: 'asc' },
        },
      },
    });
  }

  /**
   * [변경] 부대 데이터 업데이트
   */
  async updateUnitById(id, data) {
    return prisma.unit.update({
      where: { id: Number(id) },
      data,
    });
  }

  /**
   * [변경] 부대 데이터 영구 삭제
   */
  async deleteUnitById(id) {
    return prisma.unit.delete({
      where: { id: Number(id) },
    });
  }

  // ==========================================
  // [신규] 하위 리소스(일정) 관리
  // ==========================================

  async insertUnitSchedule(unitId, date) {
    return prisma.unitSchedule.create({
      data: {
        unitId: Number(unitId),
        date: new Date(date),
      },
    });
  }

  async deleteUnitSchedule(scheduleId) {
    return prisma.unitSchedule.delete({
      where: { id: Number(scheduleId) },
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
