// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  /**
   * 1. 목록 조회
   */
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        trainingLocations: true, // 목록에 표시할 정보
      }
    });
  }

  /**
   * 2. 전체 개수 조회
   */
  async count(where) {
    return prisma.unit.count({ where });
  }

  /**
   * 3. 상세 조회
   */
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

  /**
   * 4. 통합 등록 (신규) - ID 제거 로직 추가
   */
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    // 중첩 데이터 생성 시 id 필드가 있으면 오류가 발생하므로 제거하고 매핑
    const cleanLocations = (locations || []).map(({ id, unitId, ...rest }) => ({
      ...rest,
      plannedCount: Number(rest.plannedCount || 0),
      instructorsNumbers: Number(rest.instructorsNumbers || 0),
      hasInstructorLounge: Boolean(rest.hasInstructorLounge),
      hasWomenRestroom: Boolean(rest.hasWomenRestroom),
      hasCateredMeals: Boolean(rest.hasCateredMeals),
      hasHallLodging: Boolean(rest.hasHallLodging),
      allowsPhoneBeforeAfter: Boolean(rest.allowsPhoneBeforeAfter),
    }));

    const cleanSchedules = (schedules || []).map(({ id, unitId, ...rest }) => ({
      ...rest,
      date: new Date(rest.date)
    }));

    const cleanExcluded = (excludedDates || []).map(({ id, unitId, ...rest }) => ({
      ...rest,
      date: new Date(rest.date)
    }));

    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: cleanLocations },
        schedules: { create: cleanSchedules },
        excludedDates: { create: cleanExcluded },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  /**
   * 5. 통합 수정
   */
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 기본 정보 업데이트
      await tx.unit.update({
        where: { id: unitId },
        data: unitData,
      });

      // (2) 불가일자 (전체 삭제 후 재생성)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          const cleanExcluded = excludedDates.map(({ id, ...rest }) => ({
            unitId,
            date: new Date(rest.date)
          }));
          await tx.unitExcludedDate.createMany({ data: cleanExcluded });
        }
      }

      // (3) 일정 (ID가 있으면 업데이트, 없으면 생성, 목록에 없으면 삭제)
      if (schedules) {
        const keepIds = schedules.filter(s => s.id).map(s => Number(s.id));
        await tx.unitSchedule.deleteMany({
          where: { unitId, id: { notIn: keepIds } }
        });

        for (const sch of schedules) {
          const dateVal = new Date(sch.date);
          if (sch.id) {
            await tx.unitSchedule.update({ where: { id: Number(sch.id) }, data: { date: dateVal } });
          } else {
            await tx.unitSchedule.create({ data: { unitId, date: dateVal } });
          }
        }
      }

      // (4) 교육장소
      if (locations) {
        const keepLocIds = locations.filter(l => l.id).map(l => Number(l.id));
        await tx.trainingLocation.deleteMany({
          where: { unitId, id: { notIn: keepLocIds } }
        });

        for (const loc of locations) {
          const { id: locId, unitId: _, ...rest } = loc; // id와 unitId 제외하고 데이터 추출
          
          const data = {
            ...rest,
            unitId, // FK 명시
            plannedCount: Number(rest.plannedCount || 0),
            instructorsNumbers: Number(rest.instructorsNumbers || 0),
            hasInstructorLounge: Boolean(rest.hasInstructorLounge),
            hasWomenRestroom: Boolean(rest.hasWomenRestroom),
            hasCateredMeals: Boolean(rest.hasCateredMeals),
            hasHallLodging: Boolean(rest.hasHallLodging),
            allowsPhoneBeforeAfter: Boolean(rest.allowsPhoneBeforeAfter),
          };

          if (locId) {
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

  /**
   * 6. 엑셀 일괄 저장
   */
  async insertManyUnits(unitsData) {
    return prisma.$transaction(
      unitsData.map(unit => prisma.unit.create({
        data: {
          ...unit,
          // 엑셀 매퍼에서 이미 구조를 잡아둠
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