//server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  // 부대 단건 DB 삽입 (Insert)
  async insertOneUnit(data) {
    return prisma.unit.create({
      data,
      include: {
        trainingLocations: true,
        schedules: true,
      },
    });
  }

  // 부대 다건 일괄 삽입 (Bulk Insert with Transaction)
  async insertManyUnits(dataArray) {
    return prisma.$transaction(
      dataArray.map((data) =>
        prisma.unit.create({
          data,
        })
      )
    );
  }

  // 필터 조건으로 부대 목록 및 개수 조회
async findUnitsByFilterAndCount({ skip, take, where }) {
    const [total, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
      }),
    ]);

    return { total, units };
  }

  // 부대 상세 정보(하위 데이터 포함) 조회
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

  // 부대 데이터 업데이트
  async updateUnitById(id, data) {
    return prisma.unit.update({
      where: { id: Number(id) },
      data,
    });
  }

  // 부대 데이터 영구 삭제
  async deleteUnitById(id) {
    return prisma.unit.delete({
      where: { id: Number(id) },
    });
  }

  // 부대 일정 추가
  async insertUnitSchedule(unitId, date) {
    // date는 'YYYY-MM-DD' 형태라고 가정
    const dt = new Date(`${date}T00:00:00.000Z`);

    return prisma.unitSchedule.create({
      data: {
        unitId: Number(unitId),
        date: dt,
      },
    });
  }

  // 부대 일정 삭제
  async deleteUnitSchedule(scheduleId) {
    return prisma.unitSchedule.delete({
      where: { id: Number(scheduleId) },
    });
  }

  // 거리 배치용: 다가오는 부대 일정 가져오기
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
        unit: true,
      },
    });
  }

  // 위/경도 갱신
  async updateCoords(unitId, lat, lng) {
    return prisma.unit.update({
      where: { id: Number(unitId) },
      data: { lat, lng },
    });
  }
}

module.exports = new UnitRepository();
