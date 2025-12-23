// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

// [안전한 타입 변환 헬퍼]
const safeInt = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};
const safeBool = (val) => {
  if (val === true || val === 'true' || String(val).toUpperCase() === 'O') return true;
  return false;
};

class UnitRepository {
  // 1. 목록 조회
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where, skip, take, orderBy: { id: 'desc' },
      include: { trainingLocations: true }
    });
  }

  // 2. 개수 조회
  async count(where) { return prisma.unit.count({ where }); }

  // ✅ [필수] 상세 조회 시 일정(schedules) 포함
  async findUnitById(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } }, // 이게 있어야 보입니다!
        excludedDates: { orderBy: { date: 'asc' } },
      },
    });
  }

  // 4. 통합 등록
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { 
          create: (locations || []).map(loc => {
            const data = this._mapLocationData(loc);
            delete data.unitId; 
            return data;
          })
        },
        schedules: { create: (schedules || []).map(s => ({ date: new Date(s.date) })) },
        excludedDates: { create: (excludedDates || []).map(d => ({ date: new Date(d.date) })) },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // 5. 통합 수정
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // Locations
      if (locations) {
        const existing = await tx.trainingLocation.findMany({ where: { unitId }, select: { id: true } });
        const existingIds = existing.map(e => e.id);
        const incomingIds = locations.filter(l => l.id).map(l => Number(l.id));
        
        await tx.trainingLocation.deleteMany({ where: { unitId, id: { notIn: incomingIds } } }); // 삭제

        for (const loc of locations) {
          const data = this._mapLocationData(loc, unitId);
          if (loc.id && existingIds.includes(Number(loc.id))) {
            await tx.trainingLocation.update({ where: { id: Number(loc.id) }, data });
          } else {
            await tx.trainingLocation.create({ data });
          }
        }
      }

      // Schedules (재생성)
      if (schedules) {
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        await tx.unitSchedule.createMany({
          data: schedules.map(s => ({ unitId, date: new Date(s.date) }))
        });
      }

      // ExcludedDates (재생성)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        await tx.unitExcludedDate.createMany({
          data: excludedDates.map(d => ({ unitId, date: new Date(d.date) }))
        });
      }

      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true, excludedDates: true }
      });
    });
  }

  // 6. 엑셀 등 기타
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
  async deleteUnitById(id) { return prisma.unit.delete({ where: { id: Number(id) } }); }
  async deleteManyUnits(ids) { return prisma.unit.deleteMany({ where: { id: { in: ids.map(Number) } } }); }

  // [데이터 매핑 헬퍼]
  _mapLocationData(loc, unitId) {
    return {
      unitId,
      originalPlace: loc.originalPlace || null,
      changedPlace: loc.changedPlace || null,
      plannedCount: safeInt(loc.plannedCount),
      instructorsNumbers: safeInt(loc.instructorsNumbers),
      hasInstructorLounge: safeBool(loc.hasInstructorLounge),
      hasWomenRestroom: safeBool(loc.hasWomenRestroom),
      hasCateredMeals: safeBool(loc.hasCateredMeals),
      hasHallLodging: safeBool(loc.hasHallLodging),
      allowsPhoneBeforeAfter: safeBool(loc.allowsPhoneBeforeAfter),
      note: loc.note || null,
    };
  }
}

module.exports = new UnitRepository();