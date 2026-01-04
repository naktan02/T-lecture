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

/**
 * 날짜 문자열을 UTC 자정으로 변환
 * 예: "2026-01-04" -> 2026-01-04T00:00:00.000Z
 */
const toUTCMidnight = (date: Date | string): Date => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return new Date(`${dateStr}T00:00:00.000Z`);
};

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
        schedules: {
          orderBy: { date: 'asc' },
          include: {
            assignments: {
              where: { state: { in: ['Pending', 'Accepted'] } },
              select: { userId: true },
            },
          },
        },
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
            date: toUTCMidnight(s.date),
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
            const { unitId: _unused, ...updateData } = this._mapLocationData(loc, unitId);
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

      // Schedules (차분 기반 업데이트 - 변경된 날짜만 처리)
      if (schedules) {
        // 부대 정보 가져오기 (사유 기록용)
        const unitInfo = await tx.unit.findUnique({
          where: { id: unitId },
          select: { name: true },
        });
        const unitName = unitInfo?.name || `부대#${unitId}`;

        // 1. 기존 스케줄 조회 (배정 정보 + 교육장 포함)
        const existingSchedules = await tx.unitSchedule.findMany({
          where: { unitId },
          include: {
            assignments: {
              where: { state: { in: ['Pending', 'Accepted'] } },
              select: { userId: true, trainingLocationId: true },
            },
          },
        });

        // 2. 날짜 기준 Set 생성 (YYYY-MM-DD 형식으로 비교)
        const toDateString = (d: Date | string | null): string => {
          if (!d) return '';
          return new Date(d).toISOString().split('T')[0];
        };
        const validSchedules = existingSchedules.filter((s) => s.date !== null);
        const existingDateMap = new Map(validSchedules.map((s) => [toDateString(s.date), s]));
        const requestedDates = new Set(schedules.map((s) => toDateString(s.date)));

        // 3. 삭제할 스케줄 (기존에만 있는 것)
        const schedulesToDelete = validSchedules.filter(
          (s) => !requestedDates.has(toDateString(s.date)),
        );

        // 4. 추가할 스케줄 (새로 요청된 것)
        const datesToAdd = schedules.filter((s) => !existingDateMap.has(toDateString(s.date)));

        // 5. 삭제되는 스케줄의 배정 정보 수집 (자동 재배정용)
        interface DeletedAssignment {
          userId: number;
          date: string;
          trainingLocationId: number | null;
        }
        const deletedAssignments: DeletedAssignment[] = [];
        for (const schedule of schedulesToDelete) {
          for (const assignment of schedule.assignments) {
            deletedAssignments.push({
              userId: assignment.userId,
              date: toDateString(schedule.date),
              trainingLocationId: assignment.trainingLocationId,
            });
          }
        }

        // 6. 삭제할 스케줄의 메시지_배정 먼저 삭제 (FK constraint 방지)
        if (schedulesToDelete.length > 0) {
          const scheduleIds = schedulesToDelete.map((s) => s.id);
          await tx.dispatchAssignment.deleteMany({
            where: { unitScheduleId: { in: scheduleIds } },
          });
        }

        // 7. 삭제할 스케줄의 배정 삭제 (FK constraint 방지)
        if (schedulesToDelete.length > 0) {
          await tx.instructorUnitAssignment.deleteMany({
            where: { unitScheduleId: { in: schedulesToDelete.map((s) => s.id) } },
          });
        }

        // 8. 삭제할 스케줄 삭제
        if (schedulesToDelete.length > 0) {
          await tx.unitSchedule.deleteMany({
            where: { id: { in: schedulesToDelete.map((s) => s.id) } },
          });
        }

        // 7. 새 스케줄 추가
        if (datesToAdd.length > 0) {
          await tx.unitSchedule.createMany({
            data: datesToAdd.map((s) => ({
              unitId,
              date: toUTCMidnight(s.date),
            })),
          });
        }

        // 9. 자동 재배정 시도 (삭제된 강사 → 같은 부대의 다른 날짜로)
        const reassignedUserIds = new Set<number>();
        if (deletedAssignments.length > 0) {
          // 현재 부대의 모든 스케줄 조회 (새로 추가된 것 + 기존 유지된 것)
          const allSchedules = await tx.unitSchedule.findMany({
            where: { unitId },
            include: {
              assignments: {
                where: { state: { in: ['Pending', 'Accepted'] } },
                select: { userId: true },
              },
            },
          });

          for (const deleted of deletedAssignments) {
            // 각 삭제된 강사에 대해 같은 부대의 다른 날짜 중 하나에 재배정 시도
            for (const schedule of allSchedules) {
              // schedule.date가 null이면 스킵
              if (!schedule.date) continue;

              // 이미 해당 스케줄에 이 강사가 배정되어 있으면 스킵
              if (schedule.assignments.some((a) => a.userId === deleted.userId)) continue;

              // 해당 날짜에 다른 부대에 배정되었는지 확인
              const otherAssignment = await tx.instructorUnitAssignment.findFirst({
                where: {
                  userId: deleted.userId,
                  UnitSchedule: {
                    date: schedule.date,
                    unitId: { not: unitId },
                  },
                  state: { in: ['Pending', 'Accepted'] },
                },
              });
              if (otherAssignment) continue;

              // 해당 날짜가 강사의 근무가능일인지 확인
              const availability = await tx.instructorAvailability.findFirst({
                where: {
                  instructorId: deleted.userId,
                  availableOn: schedule.date!,
                },
              });
              if (!availability) continue;

              // 조건 충족 → 자동 재배정!
              await tx.instructorUnitAssignment.create({
                data: {
                  userId: deleted.userId,
                  unitScheduleId: schedule.id,
                  trainingLocationId: deleted.trainingLocationId,
                  classification: 'Temporary',
                  state: 'Pending',
                },
              });
              reassignedUserIds.add(deleted.userId);
              break; // 이 강사는 하나의 날짜에만 배정
            }
          }
        }

        // 9. 우선배정 크레딧 부여 (자동 재배정 안 된 강사만, 사유 포함)
        const uniqueDeletedUserIds = new Set(deletedAssignments.map((a) => a.userId));
        for (const userId of uniqueDeletedUserIds) {
          if (reassignedUserIds.has(userId)) continue; // 자동 재배정된 강사는 스킵

          // 해당 강사가 삭제된 날짜 중 하나 (사유용)
          const deletedDate =
            deletedAssignments.find((a) => a.userId === userId)?.date || 'unknown';

          // 기존 크레딧 조회
          const existing = await tx.instructorPriorityCredit.findUnique({
            where: { instructorId: userId },
          });

          const newReason = { unit: unitName, date: deletedDate, type: '변경' };
          const existingReasons = ((existing as any)?.reasons as Array<unknown>) || [];

          await tx.instructorPriorityCredit.upsert({
            where: { instructorId: userId },
            create: {
              instructorId: userId,
              credits: 1,
              reasons: [newReason],
            } as any, // Prisma generate 후 제거
            update: {
              credits: { increment: 1 },
              reasons: [...existingReasons, newReason],
            } as any, // Prisma generate 후 제거
          });
        }
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
