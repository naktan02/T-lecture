// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  /**
   * 1. 목록 조회 (검색 + 페이징)
   * Service에서 buildUnitWhere로 만든 where 조건과 skip, take를 받아 조회합니다.
   */
  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' }, // 최신순 정렬
      include: {
        // 목록 조회 시 필요한 연관 데이터만 가볍게 가져옴 (필요시 조정)
        trainingLocations: true, 
      }
    });
  }

  /**
   * 2. 전체 개수 조회 (페이징 계산용)
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
        excludedDates: { orderBy: { date: 'asc' } },
      },
    });
  }

  /**
   * 4. 통합 등록 (신규 부대 + 장소 + 일정 + 불가일)
   * Transaction을 사용하여 모든 데이터가 한 번에 저장되도록 보장합니다.
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
   * 5. 통합 수정 (기존 부대 정보 및 하위 데이터 업데이트)
   * 하위 데이터는 ID가 있으면 수정, 없으면 생성, 목록에 없으면 삭제하는 방식입니다.
   */
  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 부대 기본 정보 수정
      await tx.unit.update({
        where: { id: unitId },
        data: unitData,
      });

      // (2) 교육 불가 일자 처리 (전체 삭제 후 재생성 방식이 안전)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          await tx.unitExcludedDate.createMany({
            data: excludedDates.map(d => ({ unitId, date: new Date(d.date) }))
          });
        }
      }

      // (3) 일정 처리 (Schedules)
      if (schedules) {
        // 요청에 포함된 ID만 유지 (나머지는 삭제)
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

      // (4) 교육장소 처리 (TrainingLocation)
      if (locations) {
        const keepLocIds = locations.filter(l => l.id).map(l => Number(l.id));
        await tx.trainingLocation.deleteMany({
          where: { unitId, id: { notIn: keepLocIds } }
        });

        for (const loc of locations) {
          // prisma create/update 시 id 필드는 제외해야 함
          const { id: locId, ...rest } = loc;
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

      // 최종 결과 반환
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
    // createMany는 nested write를 지원하지 않으므로 transaction + map 사용
    return prisma.$transaction(
      unitsData.map(unit => prisma.unit.create({
        data: {
          ...unit,
          // Mapper에서 이미 { create: [...] } 구조로 만들어 둠
          trainingLocations: unit.trainingLocations,
          schedules: unit.schedules,
          excludedDates: unit.excludedDates
        }
      }))
    );
  }

  /**
   * 7. 삭제 기능
   */
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