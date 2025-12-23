// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

// 헬퍼
const safeInt = (val) => { if(!val) return null; const n=Number(val); return isNaN(n)?0:n; };
const safeBool = (val) => (val===true || val==='true' || String(val).toUpperCase()==='O');

class UnitRepository {
  _mapLocationData(loc, unitId) {
    return {
      unitId,
      originalPlace: loc.originalPlace||null, changedPlace: loc.changedPlace||null,
      plannedCount: safeInt(loc.plannedCount), instructorsNumbers: safeInt(loc.instructorsNumbers),
      hasInstructorLounge: safeBool(loc.hasInstructorLounge), hasWomenRestroom: safeBool(loc.hasWomenRestroom),
      hasCateredMeals: safeBool(loc.hasCateredMeals), hasHallLodging: safeBool(loc.hasHallLodging),
      allowsPhoneBeforeAfter: safeBool(loc.allowsPhoneBeforeAfter), note: loc.note||null
    };
  }

  // --- 조회 ---
  async findMany(where, skip, take) {
    return prisma.unit.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { trainingLocations: true } });
  }
  async count(where) { return prisma.unit.count({ where }); }

  // ✅ [필수] 상세 조회 시 일정 포함
  async findUnitById(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } }, // 필수
        excludedDates: { orderBy: { date: 'asc' } }, // 필수
      },
    });
  }

  // --- 등록 ---
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: (locations||[]).map(l => { const d=this._mapLocationData(l); delete d.unitId; return d; }) },
        schedules: { create: (schedules||[]).map(s => ({ date: new Date(s.date) })) },
        excludedDates: { create: (excludedDates||[]).map(d => ({ date: new Date(d.date) })) },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // --- 수정 ---
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // Locations
      if (locations) {
        const dbIds = (await tx.trainingLocation.findMany({ where: { unitId }, select: { id: true } })).map(x=>x.id);
        const reqIds = locations.filter(l=>l.id).map(l=>Number(l.id));
        await tx.trainingLocation.deleteMany({ where: { unitId, id: { notIn: reqIds } } });
        for (const loc of locations) {
          const data = this._mapLocationData(loc, unitId);
          if (loc.id && dbIds.includes(Number(loc.id))) await tx.trainingLocation.update({ where: { id: Number(loc.id) }, data });
          else await tx.trainingLocation.create({ data });
        }
      }

      // Schedules (재생성)
      if (schedules) {
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        await tx.unitSchedule.createMany({ data: schedules.map(s => ({ unitId, date: new Date(s.date) })) });
      }

      // ExcludedDates (재생성)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        await tx.unitExcludedDate.createMany({ data: excludedDates.map(d => ({ unitId, date: new Date(d.date) })) });
      }

      return tx.unit.findUnique({ where: { id: unitId }, include: { trainingLocations: true, schedules: true, excludedDates: true } });
    });
  }

  // --- 기타 ---
  async insertManyUnits(unitsData) {
    return prisma.$transaction(unitsData.map(u => prisma.unit.create({
      data: { ...u, trainingLocations: {create: u.trainingLocations}, schedules: {create: u.schedules}, excludedDates: {create: u.excludedDates} }
    })));
  }
  async deleteUnitById(id) { return prisma.unit.delete({ where: { id: Number(id) } }); }
  async deleteManyUnits(ids) { return prisma.unit.deleteMany({ where: { id: { in: ids.map(Number) } } }); }
}

module.exports = new UnitRepository();