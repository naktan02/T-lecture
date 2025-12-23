// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  // --- 조회 메서드 (기존 유지) ---
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where, skip, take, orderBy: { id: 'desc' },
      include: { trainingLocations: true }
    });
  }

  async count(where) {
    return prisma.unit.count({ where });
  }

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

  // --- 1. 신규 등록 (Create) ---
  // ID가 null인 경우 에러가 나므로, id 필드를 제거하고 저장합니다.
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    const removeId = ({ id, unitId, ...rest }) => rest;

    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: (locations || []).map(removeId) },
        schedules: { create: (schedules || []).map(removeId) },
        excludedDates: { create: (excludedDates || []).map(removeId) },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // --- 2. 수정 (Update) ---
  // ID가 있으면 수정, 없으면 생성, 리스트에 없으면 삭제합니다.
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 부대 정보 업데이트
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // (2) 교육장소 처리
      if (locations) {
        // 삭제: 요청에 없는 ID 삭제
        const incomingIds = locations.filter(l => l.id).map(l => Number(l.id));
        await tx.trainingLocation.deleteMany({ where: { unitId, id: { notIn: incomingIds } } });

        // 생성 및 수정
        for (const loc of locations) {
          const { id: locId, unitId: _, ...rest } = loc;
          // 숫자형/Boolean형 변환 안전장치
          const data = {
            ...rest,
            unitId,
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

      // (3) 일정 처리
      if (schedules) {
        const incomingIds = schedules.filter(s => s.id).map(s => Number(s.id));
        await tx.unitSchedule.deleteMany({ where: { unitId, id: { notIn: incomingIds } } });

        for (const sch of schedules) {
          const dateVal = new Date(sch.date);
          if (sch.id) {
            await tx.unitSchedule.update({ where: { id: Number(sch.id) }, data: { date: dateVal } });
          } else {
            await tx.unitSchedule.create({ data: { unitId, date: dateVal } });
          }
        }
      }

      // (4) 불가일자 처리
      if (excludedDates) {
        const incomingIds = excludedDates.filter(d => d.id).map(d => Number(d.id));
        await tx.unitExcludedDate.deleteMany({ where: { unitId, id: { notIn: incomingIds } } });

        for (const ex of excludedDates) {
          const dateVal = new Date(ex.date);
          if (ex.id) {
            await tx.unitExcludedDate.update({ where: { id: Number(ex.id) }, data: { date: dateVal } });
          } else {
            await tx.unitExcludedDate.create({ data: { unitId, date: dateVal } });
          }
        }
      }

      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true, excludedDates: true }
      });
    });
  }

  // --- 기타 (엑셀, 삭제) ---
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
}

module.exports = new UnitRepository();