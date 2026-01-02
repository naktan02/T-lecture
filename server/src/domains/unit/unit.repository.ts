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
  isExcluded?: boolean;
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

  /**
   * 좌표(lat)가 없고 주소(addressDetail)만 있는 부대 조회 (Geocoding 대상)
   */
  async findUnitsWithoutCoords(take = 100) {
    return prisma.unit.findMany({
      where: {
        lat: null,
        addressDetail: { not: null }, // 주소는 있는데 좌표가 없는 경우
      },
      take,
    });
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

  /**
   * 부대명으로 조회 (교육장소 포함)
   */
  async findUnitByName(name: string) {
    return prisma.unit.findFirst({
      where: { name },
      include: {
        trainingLocations: true,
        schedules: { orderBy: { date: 'asc' } },
      },
    });
  }

  /**
   * 부대에 교육장소 추가 (중복 체크 후)
   * @returns 추가된 교육장소 수
   */
  async addTrainingLocationsIfNotExists(
    unitId: number,
    locations: TrainingLocationData[],
  ): Promise<{ added: number; skipped: number }> {
    // 기존 교육장소 조회
    const existingLocations = await prisma.trainingLocation.findMany({
      where: { unitId },
      select: { originalPlace: true },
    });
    const existingPlaces = new Set(existingLocations.map((l) => l.originalPlace));

    let added = 0;
    let skipped = 0;

    for (const loc of locations) {
      const place = loc.originalPlace || null;
      if (place && existingPlaces.has(place)) {
        skipped++;
        continue;
      }

      // 새 교육장소 추가
      const data = this._mapLocationData(loc, unitId);
      await prisma.trainingLocation.create({
        data: {
          ...data,
          unitId,
        },
      });
      added++;
      existingPlaces.add(place);
    }

    return { added, skipped };
  }

  // --- 등록 ---

  /**
   * 부대명 목록으로 부대 일괄 조회 (Bulk Read)
   */
  async findUnitsByNames(names: string[]) {
    return prisma.unit.findMany({
      where: { name: { in: names } },
      // 교육장소 중복 체크를 위해 가져옴
      include: { trainingLocations: true },
    });
  }

  /**
   * 교육장소 일괄 생성 및 매핑 (Bulk Insert with Mapping)
   */
  async bulkAddTrainingLocations(items: { unitId: number; location: TrainingLocationData }[]) {
    if (items.length === 0) return { count: 0 };

    const dbData = items.map((item) => ({
      ...this._mapLocationData(item.location, item.unitId),
      unitId: item.unitId,
    }));

    return prisma.trainingLocation.createMany({
      data: dbData,
    });
  }

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
            isExcluded: s.isExcluded ?? false,
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

      // Schedules (재생성 - isExcluded 포함)
      if (schedules) {
        await tx.unitSchedule.deleteMany({ where: { unitId } });
        await tx.unitSchedule.createMany({
          data: schedules.map((s) => ({
            unitId,
            date: new Date(s.date),
            isExcluded: s.isExcluded ?? false,
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
