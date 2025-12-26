// server/src/domains/unit/unit.repository.ts
import prisma from '../../libs/prisma';
import { Prisma } from '@prisma/client';

interface UnitFilterParams {
  skip: number;
  take: number;
  where: Prisma.UnitWhereInput;
}

interface TrainingLocationData {
  id?: number;
  originalPlace?: string | null;
  changedPlace?: string | null;
  plannedCount?: number | string | null;
  actualCount?: number | string | null;
  instructorsNumbers?: number | string | null;
  hasInstructorLounge?: boolean | string;
  hasWomenRestroom?: boolean | string;
  hasCateredMeals?: boolean | string;
  hasHallLodging?: boolean | string;
  allowsPhoneBeforeAfter?: boolean | string;
  note?: string | null;
}

interface ScheduleData {
  date: Date | string;
}

// 헬퍼
const safeInt = (val: unknown): number | null => {
  if (!val) return null;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const safeBool = (val: unknown): boolean =>
  val === true || val === 'true' || String(val).toUpperCase() === 'O';

class UnitRepository {
  /**
   * 교육장소 데이터 매핑 (내부 헬퍼)
   */
  private _mapLocationData(loc: TrainingLocationData, unitId?: number) {
    return {
      unitId,
      originalPlace: loc.originalPlace || null,
      changedPlace: loc.changedPlace || null,
      plannedCount: safeInt(loc.plannedCount),
      actualCount: safeInt(loc.actualCount),
      instructorsNumbers: safeInt(loc.instructorsNumbers),
      hasInstructorLounge: safeBool(loc.hasInstructorLounge),
      hasWomenRestroom: safeBool(loc.hasWomenRestroom),
      hasCateredMeals: safeBool(loc.hasCateredMeals),
      hasHallLodging: safeBool(loc.hasHallLodging),
      allowsPhoneBeforeAfter: safeBool(loc.allowsPhoneBeforeAfter),
      note: loc.note || null,
    };
  }

  // --- 조회 ---

  /**
   * 필터 조건으로 부대 목록 및 개수 조회
   */
  async findUnitsByFilterAndCount({ skip, take, where }: UnitFilterParams) {
    const [total, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { trainingLocations: true },
      }),
    ]);

    return { total, units };
  }

  /**
   * 부대 상세 정보(하위 데이터 포함) 조회
   */
  async findUnitWithRelations(id: number | string) {
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } },
      },
    });
  }

  // --- 등록 ---

  /**
   * 부대 단건 DB 삽입 (Insert)
   */
  async insertOneUnit(data: Prisma.UnitCreateInput) {
    return prisma.unit.create({
      data,
      include: {
        trainingLocations: true,
        schedules: true,
      },
    });
  }

  /**
   * 부대 + 하위 데이터 함께 생성 (JS 기능 유지)
   */
  async createUnitWithNested(
    unitData: Prisma.UnitCreateInput,
    locations: TrainingLocationData[],
    schedules: ScheduleData[],
  ) {
    return prisma.unit.create({
      data: {
        ...unitData,
        trainingLocations: {
          create: (locations || []).map((l) => {
            const d = this._mapLocationData(l);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { unitId, ...rest } = d;
            return rest;
          }),
        },
        schedules: {
          create: (schedules || []).map((s) => ({
            date: new Date(s.date),
          })),
        },
      },
      include: { trainingLocations: true, schedules: true },
    });
  }

  /**
   * 부대 다건 일괄 삽입 (Bulk Insert with Transaction)
   */
  async insertManyUnits(dataArray: Prisma.UnitCreateInput[]) {
    return prisma.$transaction(
      dataArray.map((data) =>
        prisma.unit.create({
          data,
        }),
      ),
    );
  }

  // --- 수정 ---

  /**
   * 부대 데이터 업데이트
   */
  async updateUnitById(id: number | string, data: Prisma.UnitUpdateInput) {
    return prisma.unit.update({
      where: { id: Number(id) },
      data,
    });
  }

  /**
   * 부대 + 하위 데이터 함께 수정 (JS 기능 유지)
   */
  async updateUnitWithNested(
    id: number | string,
    unitData: Prisma.UnitUpdateInput,
    locations: TrainingLocationData[] | undefined,
    schedules: ScheduleData[] | undefined,
  ) {
    return prisma.$transaction(async (tx) => {
      const unitId = Number(id);
      await tx.unit.update({ where: { id: unitId }, data: unitData });

      // Locations
      if (locations) {
        const dbIds = (
          await tx.trainingLocation.findMany({ where: { unitId }, select: { id: true } })
        ).map((x) => x.id);
        const reqIds = locations.filter((l) => l.id).map((l) => Number(l.id));
        await tx.trainingLocation.deleteMany({ where: { unitId, id: { notIn: reqIds } } });

        for (const loc of locations) {
          if (loc.id && dbIds.includes(Number(loc.id))) {
            // update - unitId is not needed in data
            const { unitId: _u, ...updateData } = this._mapLocationData(loc, unitId);
            await tx.trainingLocation.update({ where: { id: Number(loc.id) }, data: updateData });
          } else {
            // create - unitId must be set
            const createData = this._mapLocationData(loc, unitId);
            await tx.trainingLocation.create({
              data: {
                ...createData,
                unitId: unitId, // explicitly set as number
              },
            });
          }
        }
      }

      // Schedules (재생성)
      if (schedules) {
        // 1. 기존 스케줄에 활성 배정된 강사들 조회 (우선배정 크레딧 부여용)
        const affectedInstructors = await tx.instructorUnitAssignment.findMany({
          where: {
            UnitSchedule: { unitId },
            state: { in: ['Pending', 'Accepted'] },
          },
          select: { userId: true },
          distinct: ['userId'],
        });

        // 2. 영향받은 강사들에게 우선배정 크레딧 부여
        for (const { userId } of affectedInstructors) {
          await tx.instructorPriorityCredit.upsert({
            where: { instructorId: userId },
            create: { instructorId: userId, credits: 1 },
            update: { credits: { increment: 1 } },
          });
        }

        // 3. 기존 스케줄 삭제 (배정도 cascade 삭제)
        await tx.unitSchedule.deleteMany({ where: { unitId } });

        // 4. 새 스케줄 생성
        await tx.unitSchedule.createMany({
          data: schedules.map((s) => ({
            unitId,
            date: new Date(s.date),
          })),
        });
      }

      return tx.unit.findUnique({
        where: { id: unitId },
        include: { trainingLocations: true, schedules: true },
      });
    });
  }

  // --- 일정 관리 ---

  /**
   * 부대 일정 추가
   */
  async insertUnitSchedule(unitId: number | string, date: string) {
    // date는 'YYYY-MM-DD' 형태라고 가정
    const dt = new Date(`${date}T00:00:00.000Z`);

    return prisma.unitSchedule.create({
      data: {
        unitId: Number(unitId),
        date: dt,
      },
    });
  }

  /**
   * 부대 일정 삭제
   */
  async deleteUnitSchedule(scheduleId: number | string) {
    return prisma.unitSchedule.delete({
      where: { id: Number(scheduleId) },
    });
  }

  // --- 삭제 ---

  /**
   * 부대 데이터 영구 삭제
   */
  async deleteUnitById(id: number | string) {
    return prisma.unit.delete({
      where: { id: Number(id) },
    });
  }

  /**
   * 부대 다건 일괄 삭제 (ID 목록)
   */
  async deleteManyUnits(ids: (number | string)[]) {
    return prisma.unit.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
  }

  /**
   * 필터 조건에 맞는 모든 부대 삭제
   */
  async deleteUnitsByFilter(where: Prisma.UnitWhereInput) {
    return prisma.unit.deleteMany({ where });
  }

  // --- 거리 배치용 ---

  /**
   * 다가오는 부대 일정 가져오기
   */
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

  /**
   * 위/경도 갱신
   */
  async updateCoords(unitId: number | string, lat: number, lng: number) {
    return prisma.unit.update({
      where: { id: Number(unitId) },
      data: { lat, lng },
    });
  }
}

export default new UnitRepository();

// CommonJS 호환
module.exports = new UnitRepository();
