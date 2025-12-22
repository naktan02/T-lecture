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

  // ✅ [추가] 부대 정보 + 교육장소 + 일정 동시 업데이트
  async updateUnitWithNested(id, simpleFields, trainingLocations = [], schedules = []) {
    return prisma.$transaction(async (tx) => {
      // 1. 기본 정보 업데이트
      await tx.unit.update({
        where: { id: Number(id) },
        data: simpleFields,
      });

      // 2. 교육장소 처리 (TrainingLocation)
      if (trainingLocations && trainingLocations.length > 0) {
        const incomingIds = trainingLocations.filter(t => t.id).map(t => Number(t.id));
        
        // 2-1. 삭제: 요청에 포함되지 않은 기존 장소 삭제
        await tx.trainingLocation.deleteMany({
          where: { unitId: Number(id), id: { notIn: incomingIds } }
        });

        // 2-2. 생성 및 수정
        for (const loc of trainingLocations) {
          const locData = {
            originalPlace: loc.originalPlace,
            changedPlace: loc.changedPlace,
            hasInstructorLounge: loc.hasInstructorLounge,
            hasWomenRestroom: loc.hasWomenRestroom,
            hasCateredMeals: loc.hasCateredMeals,
            hasHallLodging: loc.hasHallLodging,
            allowsPhoneBeforeAfter: loc.allowsPhoneBeforeAfter,
            plannedCount: loc.plannedCount ? Number(loc.plannedCount) : null,
            actualCount: loc.actualCount ? Number(loc.actualCount) : null,
            instructorsNumbers: loc.instructorsNumbers ? Number(loc.instructorsNumbers) : null,
            note: loc.note,
            unitId: Number(id)
          };

          if (loc.id) {
            await tx.trainingLocation.update({ where: { id: Number(loc.id) }, data: locData });
          } else {
            await tx.trainingLocation.create({ data: locData });
          }
        }
      }

      // 3. 일정 처리 (UnitSchedule)
      if (schedules && schedules.length > 0) {
        const incomingSchIds = schedules.filter(s => s.id).map(s => Number(s.id));
        
        // 3-1. 삭제
        await tx.unitSchedule.deleteMany({
           where: { unitId: Number(id), id: { notIn: incomingSchIds } }
        });

        // 3-2. 생성 및 수정
        for (const sch of schedules) {
           const dateVal = new Date(sch.date);
           if (sch.id) {
             await tx.unitSchedule.update({ where: { id: Number(sch.id) }, data: { date: dateVal } });
           } else {
             await tx.unitSchedule.create({ data: { unitId: Number(id), date: dateVal } });
           }
        }
      }

      // 최종 결과 반환
      return tx.unit.findUnique({
        where: { id: Number(id) },
        include: { trainingLocations: true, schedules: { orderBy: { date: 'asc' } } }
      });
    });
  }
}

module.exports = new UnitRepository();
