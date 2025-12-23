// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  // 1. 목록 조회 (기존 기능 유지)
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        trainingLocations: true, // 목록에 필요한 정보만 포함
      }
    });
  }

  // 2. 개수 조회 (기존 기능 유지)
  async count(where) {
    return prisma.unit.count({ where });
  }

  // 3. 상세 조회 (기존 기능 유지 + 불가일자 포함)
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

  // 4. [수정됨] 통합 등록 (신규) - ID 필드 제거 및 타입 변환 안전장치 추가
  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    // 하위 데이터 저장 시 id가 있으면 에러가 나므로, id를 제외하고 저장합니다.
    const sanitize = (item) => {
      const { id, unitId, ...rest } = item;
      return rest;
    };

    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: { create: (locations || []).map(sanitize) },
        schedules: { create: (schedules || []).map(sanitize) },
        excludedDates: { create: (excludedDates || []).map(sanitize) },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // 5. [수정됨] 통합 수정 - 하위 데이터 충돌 방지 로직 적용
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 부대 기본 정보 업데이트
      await tx.unit.update({
        where: { id: unitId },
        data: unitData,
      });

      // (2) 하위 데이터 처리 전략: "모두 삭제 후 재생성"
      // 복잡한 ID 비교 로직 대신, 기존 데이터를 지우고 현재 화면의 데이터로 덮어씌웁니다.
      // 이 방식이 수정 시 발생하는 ID 충돌 에러를 가장 확실하게 막습니다.

      // 2-1. 교육장소
      if (locations) {
        await tx.trainingLocation.deleteMany({ where: { unitId } });
        if (locations.length > 0) {
          const locData = locations.map(loc => {
            const { id, unitId, ...rest } = loc; // id 제외
            return {
              ...rest,
              unitId, // FK 명시
              plannedCount: Number(rest.plannedCount || 0),
              instructorsNumbers: Number(rest.instructorsNumbers || 0),
              // Boolean 필드 안전 변환
              hasInstructorLounge: Boolean(rest.hasInstructorLounge),
              hasWomenRestroom: Boolean(rest.hasWomenRestroom),
              hasCateredMeals: Boolean(rest.hasCateredMeals),
              hasHallLodging: Boolean(rest.hasHallLodging),
              allowsPhoneBeforeAfter: Boolean(rest.allowsPhoneBeforeAfter),
            };
          });
          await tx.trainingLocation.createMany({ data: locData });
        }
      }

      // 2-2. 일정
      if (schedules) {
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        if (schedules.length > 0) {
          const schData = schedules.map(s => ({
            unitId,
            date: new Date(s.date)
          }));
          await tx.unitSchedule.createMany({ data: schData });
        }
      }

      // 2-3. 불가일자
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          const exclData = excludedDates.map(d => ({
            unitId,
            date: new Date(d.date)
          }));
          await tx.unitExcludedDate.createMany({ data: exclData });
        }
      }

      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true, excludedDates: true }
      });
    });
  }

  // 6. 엑셀 일괄 저장 (기존 기능 유지)
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

  // 7. 삭제 (기존 기능 유지)
  async deleteUnitById(id) {
    return prisma.unit.delete({ where: { id: Number(id) } });
  }

  async deleteManyUnits(ids) {
    return prisma.unit.deleteMany({
      where: { id: { in: ids.map(Number) } }
    });
  }
}

module.exports = new UnitRepository();