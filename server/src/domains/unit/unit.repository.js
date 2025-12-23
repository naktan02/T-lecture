// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

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

  // 3. 상세 조회 (✅ excludedDates 포함 확인)
  async findUnitById(id) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } },
        excludedDates: { orderBy: { date: 'asc' } }, 
      },
    });
  }

  // 4. 등록 (ID 제거 로직 포함)
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    // id 제거 헬퍼
    const clean = (arr) => (arr || []).map(({ id, unitId, ...rest }) => ({
        ...rest,
        // 숫자형 변환 안전장치
        plannedCount: rest.plannedCount ? Number(rest.plannedCount) : 0,
        instructorsNumbers: rest.instructorsNumbers ? Number(rest.instructorsNumbers) : 0
    }));

    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: clean(locations) },
        schedules: { create: clean(schedules) },
        excludedDates: { create: clean(excludedDates) },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // 5. 수정 (✅ ID 충돌 방지 로직 강화)
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 기본 정보
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // (2) 불가일자 (전체 삭제 후 재생성 - 가장 안전)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          await tx.unitExcludedDate.createMany({
            data: excludedDates.map(d => ({ unitId, date: new Date(d.date) }))
          });
        }
      }

      // (3) 일정 (전체 삭제 후 재생성 - 자동 계산 로직이므로 이게 더 적합)
      if (schedules) {
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        if (schedules.length > 0) {
          await tx.unitSchedule.createMany({
            data: schedules.map(s => ({ unitId, date: new Date(s.date) }))
          });
        }
      }

      // (4) 교육장소 (기존 ID 유지하면서 업데이트)
      if (locations) {
        // 현재 DB에 있는 ID 목록
        const currentLocs = await tx.trainingLocation.findMany({ where: { unitId }, select: { id: true } });
        const currentIds = currentLocs.map(l => l.id);
        
        // 요청받은 ID 목록
        const incomingIds = locations.filter(l => l.id).map(l => Number(l.id));

        // 삭제할 ID (DB에는 있는데 요청엔 없는 것)
        const toDelete = currentIds.filter(cid => !incomingIds.includes(cid));
        if (toDelete.length > 0) {
          await tx.trainingLocation.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Upsert (ID 있으면 update, 없으면 create)
        for (const loc of locations) {
          const { id: locId, unitId: _, ...rest } = loc; // id, unitId 제외
          const data = {
            ...rest,
            unitId,
            plannedCount: Number(rest.plannedCount || 0),
            instructorsNumbers: Number(rest.instructorsNumbers || 0),
            // Boolean 변환
            hasInstructorLounge: Boolean(rest.hasInstructorLounge),
            hasWomenRestroom: Boolean(rest.hasWomenRestroom),
            hasCateredMeals: Boolean(rest.hasCateredMeals),
            hasHallLodging: Boolean(rest.hasHallLodging),
            allowsPhoneBeforeAfter: Boolean(rest.allowsPhoneBeforeAfter),
          };

          if (locId && currentIds.includes(Number(locId))) {
            await tx.trainingLocation.update({ where: { id: Number(locId) }, data });
          } else {
            await tx.trainingLocation.create({ data });
          }
        }
      }

      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true, excludedDates: true }
      });
    });
  }

  // 6. 엑셀 등록
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