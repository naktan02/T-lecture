// server/src/domains/unit/unit.repository.js
const prisma = require('../../libs/prisma');

class UnitRepository {
  /**
   * [헬퍼 함수] 교육장소 데이터 타입 변환 (String -> Int/Boolean)
   * DB 스키마와 타입을 일치시키기 위해 필수적인 과정입니다.
   */
  _transformLocation(loc) {
    // id와 unitId는 로직에서 별도로 처리하므로 데이터 객체에서는 제외
    const { id, unitId, ...rest } = loc;
    
    return {
      ...rest,
      // 숫자로 변환 (값이 없거나 이상하면 0 또는 null 처리)
      plannedCount: rest.plannedCount ? Number(rest.plannedCount) : 0,
      instructorsNumbers: rest.instructorsNumbers ? Number(rest.instructorsNumbers) : 0,
      
      // 불리언(True/False) 변환 확실하게
      hasInstructorLounge: Boolean(rest.hasInstructorLounge),
      hasWomenRestroom: Boolean(rest.hasWomenRestroom),
      hasCateredMeals: Boolean(rest.hasCateredMeals),
      hasHallLodging: Boolean(rest.hasHallLodging),
      allowsPhoneBeforeAfter: Boolean(rest.allowsPhoneBeforeAfter),
    };
  }

  /**
   * [헬퍼 함수] 날짜 객체 변환 (String -> Date)
   */
  _transformDateObj(obj) {
    const { id, unitId, ...rest } = obj;
    return {
      ...rest,
      date: new Date(rest.date) // 문자열 날짜를 Date 객체로 변환
    };
  }

  // =================================================================
  // 1. 조회 관련 기능 (기존 기능 유지)
  // =================================================================

  async findMany(where, skip, take) {
    return prisma.unit.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      include: {
        trainingLocations: true, // 목록 조회 시 교육장소 정보 포함
      }
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

  // =================================================================
  // 2. 등록(Create) 기능
  // =================================================================

  async createUnitWithNested(unitData, locations, schedules, excludedDates) {
    return prisma.unit.create({
      data: {
        ...unitData,
        // 하위 데이터 각각에 대해 타입 변환 수행 후 저장
        trainingLocations: { 
          create: (locations || []).map(loc => this._transformLocation(loc)) 
        },
        schedules: { 
          create: (schedules || []).map(sch => this._transformDateObj(sch)) 
        },
        excludedDates: { 
          create: (excludedDates || []).map(ex => this._transformDateObj(ex)) 
        },
      },
      include: { trainingLocations: true, schedules: true, excludedDates: true }
    });
  }

  // =================================================================
  // 3. 수정(Update) 기능
  // =================================================================

  async updateUnitWithNested(id, unitData, locations, schedules, excludedDates) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);

      // (1) 부대 기본 정보 업데이트
      await tx.unit.update({
        where: { id: unitId },
        data: unitData,
      });

      // (2) 교육장소 처리 (ID 기반 스마트 업데이트)
      if (locations) {
        // DB에 있는 기존 ID 목록 조회
        const existing = await tx.trainingLocation.findMany({ where: { unitId }, select: { id: true } });
        const existingIds = existing.map(e => e.id);
        
        // 요청받은 ID 목록
        const incomingIds = locations.filter(l => l.id).map(l => Number(l.id));

        // 삭제: DB에는 있는데 요청엔 없는 ID
        const toDelete = existingIds.filter(dbId => !incomingIds.includes(dbId));
        if (toDelete.length > 0) {
          await tx.trainingLocation.deleteMany({ where: { id: { in: toDelete } } });
        }

        // 생성 및 수정
        for (const loc of locations) {
          const data = this._transformLocation(loc); // 타입 변환 적용
          data.unitId = unitId; // FK 연결

          if (loc.id && existingIds.includes(Number(loc.id))) {
            // ID가 있고 DB에도 존재하면 -> 수정
            await tx.trainingLocation.update({ where: { id: Number(loc.id) }, data });
          } else {
            // ID가 없거나 DB에 없으면 -> 신규 생성
            await tx.trainingLocation.create({ data });
          }
        }
      }

      // (3) 일정 처리 (전체 삭제 후 재생성 방식 권장 - 자동 계산 로직 때문)
      if (schedules) {
        // 기존 일정 삭제
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        // 새 일정 일괄 등록
        if (schedules.length > 0) {
          await tx.unitSchedule.createMany({
            data: schedules.map(s => ({
              unitId,
              date: new Date(s.date)
            }))
          });
        }
      }

      // (4) 불가일자 처리 (전체 삭제 후 재생성)
      if (excludedDates) {
        await tx.unitExcludedDate.deleteMany({ where: { unitId } });
        if (excludedDates.length > 0) {
          await tx.unitExcludedDate.createMany({
            data: excludedDates.map(d => ({
              unitId,
              date: new Date(d.date)
            }))
          });
        }
      }

      // 결과 반환
      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true, excludedDates: true }
      });
    });
  }

  // =================================================================
  // 4. 기타 기능 (엑셀, 삭제) - 기존 코드 유지
  // =================================================================

  async insertManyUnits(unitsData) {
    return prisma.$transaction(
      unitsData.map(unit => prisma.unit.create({
        data: {
          ...unit,
          // 엑셀 매퍼에서 넘어온 데이터도 동일하게 구조가 잡혀있어야 함
          trainingLocations: { create: unit.trainingLocations },
          schedules: { create: unit.schedules },
          excludedDates: { create: unit.excludedDates }
        }
      }))
    );
  }

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