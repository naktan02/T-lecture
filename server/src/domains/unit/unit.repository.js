const prisma = require('../../libs/prisma');

class UnitRepository {
  /**
   * 1. 목록 조회 (검색 + 페이징) - ✅ 복구됨
   */
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        trainingLocations: true, // 리스트에 표시할 정보
      }
    });
  }

  /**
   * 2. 전체 개수 조회 - ✅ 복구됨
   */
  async count(where) {
    return prisma.unit.count({ where });
  }

  /**
   * 3. 상세 조회 (모든 하위 데이터 포함)
   */
  async findUnitById(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } },
        excludedDates: { orderBy: { date: 'asc' } }, // ✅ 불가일자 포함
      },
    });
  }

  /**
   * 4. 통합 등록 (신규 생성)
   */
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: locations || [] },
        schedules: { create: schedules || [] },
        excludedDates: { create: excludedDates || [] },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  /**
   * 5. 통합 수정 (업데이트)
   */
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 기본 정보
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // (2) 불가일자 (전체 교체)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          await tx.unitExcludedDate.createMany({
            data: excludedDates.map(d => ({ unitId, date: new Date(d.date) }))
          });
        }
      }

      // (3) 일정 (ID 기반 업데이트)
      if (schedules) {
        const keepIds = schedules.filter(s => s.id).map(s => Number(s.id));
        await tx.unitSchedule.deleteMany({ where: { unitId, id: { notIn: keepIds } } });
        for (const s of schedules) {
          if (s.id) await tx.unitSchedule.update({ where: { id: Number(s.id) }, data: { date: new Date(s.date) } });
          else await tx.unitSchedule.create({ data: { unitId, date: new Date(s.date) } });
        }
      }

      // (4) 교육장소
      if (locations) {
        const keepIds = locations.filter(l => l.id).map(l => Number(l.id));
        await tx.trainingLocation.deleteMany({ where: { unitId, id: { notIn: keepIds } } });
        for (const loc of locations) {
          const { id: locId, ...rest } = loc;
          const data = { ...rest, unitId, plannedCount: Number(rest.plannedCount||0), instructorsNumbers: Number(rest.instructorsNumbers||0) };
          if (locId) await tx.trainingLocation.update({ where: { id: Number(locId) }, data });
          else await tx.trainingLocation.create({ data });
        }
      }

      return tx.unit.findUnique({ where: { id: unitId }, include: { trainingLocations: true, schedules: true, excludedDates: true } });
    });
  }

  /**
   * 6. 엑셀 일괄 저장
   */
  async insertManyUnits(unitsData) {
    return prisma.$transaction(
      unitsData.map(unit => prisma.unit.create({
        data: {
          ...unit,
          trainingLocations: { create: unit.trainingLocations },
          schedules: { create: unit.schedules },
          excludedDates: { create: unit.excludedDates }
        }
      }))
    );
  }

  // 삭제
  async deleteUnitById(id) { return prisma.unit.delete({ where: { id: Number(id) } }); }
  async deleteManyUnits(ids) { return prisma.unit.deleteMany({ where: { id: { in: ids.map(Number) } } }); }
}

module.exports = new UnitRepository();