// server/src/domains/unit/unit.repository.ts
import prisma from '../../libs/prisma';
import { Prisma } from '../../generated/prisma/client.js';
import { TrainingLocationData, ScheduleData, UnitFilterParams } from '../../types/unit.types';

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
   * NOTE: hasCateredMeals, hasHallLodging, allowsPhoneBeforeAfter는 TrainingPeriod로 이동
   * NOTE: plannedCount, actualCount는 ScheduleLocation으로 이동
   */
  private _mapLocationData(loc: TrainingLocationData, _unitId?: number) {
    return {
      originalPlace: loc.originalPlace || null,
      changedPlace: loc.changedPlace || null,
      hasInstructorLounge: safeBool(loc.hasInstructorLounge),
      hasWomenRestroom: safeBool(loc.hasWomenRestroom),
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
  async findUnitsByFilterAndCount({ skip, take, where, orderBy }: UnitFilterParams) {
    const [total, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { id: 'desc' },
        include: {
          trainingPeriods: {
            include: {
              locations: true,
              schedules: true,
            },
          },
        },
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
        trainingPeriods: {
          include: {
            locations: {
              include: {
                scheduleLocations: true,
              },
            },
            schedules: {
              orderBy: { date: 'asc' },
              include: {
                scheduleLocations: true,
                assignments: {
                  where: { state: { in: ['Pending', 'Accepted'] } },
                  select: { userId: true, trainingLocationId: true },
                },
              },
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
        trainingPeriods: {
          include: {
            locations: true,
            schedules: { orderBy: { date: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * 교육기간에 교육장소 추가 (중복 체크 후)
   * @returns 추가된 교육장소 수
   */
  async addTrainingLocationsIfNotExists(
    trainingPeriodId: number,
    locations: TrainingLocationData[],
  ): Promise<{ added: number; skipped: number }> {
    // 기존 교육장소 조회
    const existingLocations = await prisma.trainingLocation.findMany({
      where: { trainingPeriodId },
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
      const data = this._mapLocationData(loc);
      await prisma.trainingLocation.create({
        data: {
          ...data,
          trainingPeriodId,
        },
      });
      added++;
      existingPlaces.add(place);
    }

    return { added, skipped };
  }

  /**
   * 부대명 목록으로 부대 일괄 조회 (Bulk Read)
   */
  async findUnitsByNames(names: string[]) {
    return prisma.unit.findMany({
      where: { name: { in: names } },
      include: {
        trainingPeriods: {
          include: { locations: true },
        },
      },
    });
  }

  /**
   * 교육장소 일괄 생성 및 매핑 (Bulk Insert with Mapping)
   */
  async bulkAddTrainingLocations(
    items: { trainingPeriodId: number; location: TrainingLocationData }[],
  ) {
    if (items.length === 0) return { count: 0 };

    const dbData = items.map((item) => ({
      ...this._mapLocationData(item.location),
      trainingPeriodId: item.trainingPeriodId,
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
        trainingPeriods: {
          include: {
            locations: true,
            schedules: true,
          },
        },
      },
    });
  }

  /**
   * 부대 + TrainingPeriod 함께 생성 (새 구조)
   * - 모든 TrainingPeriod 필드 지원 (시간, 담당관, 시설 정보)
   * - ScheduleLocation 자동 생성 (모든 일정에 모든 장소 연결)
   */
  async createUnitWithTrainingPeriod(
    unitData: Prisma.UnitCreateInput,
    periodData: {
      name: string;
      workStartTime?: Date | string | null;
      workEndTime?: Date | string | null;
      lunchStartTime?: Date | string | null;
      lunchEndTime?: Date | string | null;
      officerName?: string | null;
      officerPhone?: string | null;
      officerEmail?: string | null;
      hasCateredMeals?: boolean;
      hasHallLodging?: boolean;
      allowsPhoneBeforeAfter?: boolean;
      locations?: TrainingLocationData[];
      schedules?: ScheduleData[];
    },
  ) {
    // 시간 문자열을 Date로 변환 (HH:MM 형식 지원)
    const parseTime = (t: Date | string | null | undefined): Date | null => {
      if (!t) return null;
      if (t instanceof Date) return t;
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
        return new Date(`2000-01-01T${t}:00.000Z`);
      }
      const d = new Date(t);
      return isNaN(d.getTime()) ? null : d;
    };

    // 1. Unit + TrainingPeriod + Locations + Schedules 생성
    const unit = await prisma.unit.create({
      data: {
        ...unitData,
        trainingPeriods: {
          create: {
            name: periodData.name,
            workStartTime: parseTime(periodData.workStartTime),
            workEndTime: parseTime(periodData.workEndTime),
            lunchStartTime: parseTime(periodData.lunchStartTime),
            lunchEndTime: parseTime(periodData.lunchEndTime),
            officerName: periodData.officerName || null,
            officerPhone: periodData.officerPhone || null,
            officerEmail: periodData.officerEmail || null,
            hasCateredMeals: periodData.hasCateredMeals ?? false,
            hasHallLodging: periodData.hasHallLodging ?? false,
            allowsPhoneBeforeAfter: periodData.allowsPhoneBeforeAfter ?? false,
            locations: {
              create: (periodData.locations || []).map((l) => {
                const d = this._mapLocationData(l);
                return d;
              }),
            },
            schedules: {
              create: (periodData.schedules || []).map((s) => ({
                date: toUTCMidnight(s.date),
              })),
            },
          },
        },
      },
      include: {
        trainingPeriods: {
          include: {
            locations: true,
            schedules: true,
          },
        },
      },
    });

    // 2. ScheduleLocation 생성 (모든 schedule × 모든 location)
    const trainingPeriod = unit.trainingPeriods[0];
    if (
      trainingPeriod &&
      trainingPeriod.locations.length > 0 &&
      trainingPeriod.schedules.length > 0
    ) {
      const scheduleLocationData: {
        unitScheduleId: number;
        trainingLocationId: number;
        plannedCount: number | null;
        actualCount: number | null;
      }[] = [];

      // locations 배열과 DB에 저장된 locations를 인덱스로 매칭
      const dbLocations = trainingPeriod.locations;
      const inputLocations = periodData.locations || [];

      for (const schedule of trainingPeriod.schedules) {
        for (let i = 0; i < dbLocations.length; i++) {
          const dbLoc = dbLocations[i];
          // 입력 데이터에서 인원수 가져오기 (인덱스 매칭)
          const inputLoc = inputLocations[i];
          scheduleLocationData.push({
            unitScheduleId: schedule.id,
            trainingLocationId: dbLoc.id,
            plannedCount: safeInt(inputLoc?.plannedCount),
            actualCount: safeInt(inputLoc?.actualCount),
          });
        }
      }

      if (scheduleLocationData.length > 0) {
        await prisma.scheduleLocation.createMany({
          data: scheduleLocationData,
        });
      }
    }

    // 3. ScheduleLocation 포함하여 다시 조회
    return prisma.unit.findUnique({
      where: { id: unit.id },
      include: {
        trainingPeriods: {
          include: {
            locations: true,
            schedules: {
              include: {
                scheduleLocations: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 부대 데이터 업데이트
   */
  async updateUnitById(id: number | string, data: Prisma.UnitUpdateInput) {
    return prisma.unit.update({
      where: { id: Number(id) },
      data,
    });
  }

  async addSchedulesToPeriod(trainingPeriodId: number, dates: (Date | string)[]) {
    if (dates.length === 0) return { count: 0 };

    return prisma.unitSchedule.createMany({
      data: dates.map((d) => ({
        trainingPeriodId,
        date: toUTCMidnight(d),
      })),
      skipDuplicates: true,
    });
  }

  /**
   * 일정 삭제 (크레딧 부여 + 자동 재배정 로직 포함)
   * - 삭제되는 일정에 배정된 강사들에게 우선배정 크레딧 부여
   * - 같은 TrainingPeriod 내 다른 날짜로 자동 재배정 시도
   */
  async removeSchedulesFromPeriod(scheduleIds: number[], unitName?: string) {
    if (scheduleIds.length === 0) return { deleted: 0, creditsGiven: 0, reassigned: 0 };

    const toDateString = (d: Date | string | null): string => {
      if (!d) return '';
      return new Date(d).toISOString().split('T')[0];
    };

    return prisma.$transaction(async (tx) => {
      // 1. 삭제될 일정의 배정 정보 수집
      const schedulesWithAssignments = await tx.unitSchedule.findMany({
        where: { id: { in: scheduleIds } },
        include: {
          trainingPeriod: { select: { id: true, unitId: true } },
          assignments: {
            where: { state: { in: ['Pending', 'Accepted'] } },
            select: { userId: true, trainingLocationId: true },
          },
        },
      });

      interface DeletedAssignment {
        userId: number;
        date: string;
        trainingLocationId: number | null;
        trainingPeriodId: number;
      }
      const deletedAssignments: DeletedAssignment[] = [];

      for (const schedule of schedulesWithAssignments) {
        for (const assignment of schedule.assignments) {
          deletedAssignments.push({
            userId: assignment.userId,
            date: toDateString(schedule.date),
            trainingLocationId: assignment.trainingLocationId,
            trainingPeriodId: schedule.trainingPeriodId,
          });
        }
      }

      // 2. FK 관련 데이터 삭제
      await tx.dispatchAssignment.deleteMany({
        where: { unitScheduleId: { in: scheduleIds } },
      });
      await tx.instructorUnitAssignment.deleteMany({
        where: { unitScheduleId: { in: scheduleIds } },
      });
      await tx.scheduleLocation.deleteMany({
        where: { unitScheduleId: { in: scheduleIds } },
      });

      // 3. 일정 삭제
      const deleteResult = await tx.unitSchedule.deleteMany({
        where: { id: { in: scheduleIds } },
      });

      // 4. 자동 재배정 시도
      const reassignedUserIds = new Set<number>();
      if (deletedAssignments.length > 0) {
        for (const deleted of deletedAssignments) {
          // 같은 TrainingPeriod의 다른 일정 조회
          const otherSchedules = await tx.unitSchedule.findMany({
            where: {
              trainingPeriodId: deleted.trainingPeriodId,
              id: { notIn: scheduleIds },
            },
            include: {
              assignments: {
                where: { state: { in: ['Pending', 'Accepted'] } },
                select: { userId: true },
              },
            },
          });

          for (const schedule of otherSchedules) {
            if (!schedule.date) continue;
            if (schedule.assignments.some((a) => a.userId === deleted.userId)) continue;

            // 해당 날짜에 다른 부대 배정 확인
            const otherAssignment = await tx.instructorUnitAssignment.findFirst({
              where: {
                userId: deleted.userId,
                UnitSchedule: {
                  date: schedule.date,
                  trainingPeriod: {
                    unitId: { not: schedulesWithAssignments[0]?.trainingPeriod?.unitId },
                  },
                },
                state: { in: ['Pending', 'Accepted'] },
              },
            });
            if (otherAssignment) continue;

            // 근무가능일 확인
            const availability = await tx.instructorAvailability.findFirst({
              where: {
                instructorId: deleted.userId,
                availableOn: schedule.date,
              },
            });
            if (!availability) continue;

            // 자동 재배정
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
            break;
          }
        }
      }

      // 5. 우선배정 크레딧 부여 (자동 재배정 안 된 강사만)
      let creditsGiven = 0;
      const uniqueDeletedUserIds = new Set(deletedAssignments.map((a) => a.userId));
      for (const userId of uniqueDeletedUserIds) {
        if (reassignedUserIds.has(userId)) continue;

        const deletedDate = deletedAssignments.find((a) => a.userId === userId)?.date || 'unknown';
        const existing = await tx.instructorPriorityCredit.findUnique({
          where: { instructorId: userId },
        });

        const newReason = { unit: unitName || 'unknown', date: deletedDate, type: '변경' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingReasons = ((existing as any)?.reasons as Array<unknown>) || [];

        await tx.instructorPriorityCredit.upsert({
          where: { instructorId: userId },
          create: {
            instructorId: userId,
            credits: 1,
            reasons: [newReason],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          update: {
            credits: { increment: 1 },
            reasons: [...existingReasons, newReason],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
        creditsGiven++;
      }

      return {
        deleted: deleteResult.count,
        creditsGiven,
        reassigned: reassignedUserIds.size,
      };
    });
  }

  /**
   * TrainingPeriod 정보 업데이트
   */
  async updateTrainingPeriod(id: number, data: Prisma.TrainingPeriodUpdateInput) {
    return prisma.trainingPeriod.update({
      where: { id },
      data,
    });
  }

  /**
   * 교육장소 정보 업데이트
   */
  async updateTrainingLocation(id: number, data: Prisma.TrainingLocationUpdateInput) {
    return prisma.trainingLocation.update({
      where: { id },
      data,
    });
  }

  /**
   * ScheduleLocation 추가/수정 (날짜별 장소 인원)
   */
  async upsertScheduleLocation(
    unitScheduleId: number,
    trainingLocationId: number,
    data: { plannedCount?: number; actualCount?: number; requiredCount?: number },
  ) {
    return prisma.scheduleLocation.upsert({
      where: {
        unitScheduleId_trainingLocationId: { unitScheduleId, trainingLocationId },
      },
      create: {
        unitScheduleId,
        trainingLocationId,
        plannedCount: data.plannedCount,
        actualCount: data.actualCount,
        requiredCount: data.requiredCount,
      },
      update: {
        plannedCount: data.plannedCount,
        actualCount: data.actualCount,
        requiredCount: data.requiredCount,
      },
    });
  }

  // 일정별 장소 인원 동기화
  async syncScheduleLocations(
    unitScheduleId: number,
    inputs: {
      trainingLocationId: number;
      plannedCount?: number | null;
      actualCount?: number | null;
      requiredCount?: number | null;
    }[],
  ) {
    const existing = await prisma.scheduleLocation.findMany({
      where: { unitScheduleId },
    });

    const incomingIds = new Set(inputs.map((i) => i.trainingLocationId));
    const toDelete = existing.filter((e) => !incomingIds.has(e.trainingLocationId));

    if (toDelete.length > 0) {
      await prisma.scheduleLocation.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }

    for (const item of inputs) {
      await this.upsertScheduleLocation(unitScheduleId, item.trainingLocationId, {
        plannedCount: item.plannedCount ?? undefined,
        actualCount: item.actualCount ?? undefined,
        requiredCount: item.requiredCount ?? undefined,
      });
    }
  }

  // --- 일정 관리 ---

  /**
   * TrainingPeriod에 일정 추가 (단건)
   */
  async insertUnitSchedule(trainingPeriodId: number | string, date: string) {
    // date는 'YYYY-MM-DD' 형태라고 가정
    const dt = new Date(`${date}T00:00:00.000Z`);

    return prisma.unitSchedule.create({
      data: {
        trainingPeriodId: Number(trainingPeriodId),
        date: dt,
      },
    });
  }

  /**
   * 일정 단건 조회 (unitId 조회용)
   */
  async findScheduleById(id: number) {
    return prisma.unitSchedule.findUnique({
      where: { id },
      include: {
        trainingPeriod: { select: { unitId: true } },
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
   * 다가오는 일정 가져오기 (부대 정보 포함)
   */
  async findUpcomingSchedules(limit = 50) {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );

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
        trainingPeriod: {
          include: { unit: true },
        },
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

  // ===== TrainingPeriod 일정 조회 =====

  /**
   * TrainingPeriod의 일정과 배정 정보 조회
   */
  async findSchedulesWithAssignments(trainingPeriodId: number) {
    return prisma.unitSchedule.findMany({
      where: { trainingPeriodId },
      include: {
        assignments: {
          where: { state: { in: ['Pending', 'Accepted'] } },
          include: { User: { select: { name: true } } },
        },
      },
    });
  }

  /**
   * TrainingPeriod의 일정만 조회
   */
  async findSchedulesByPeriodId(trainingPeriodId: number) {
    return prisma.unitSchedule.findMany({
      where: { trainingPeriodId },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * TrainingPeriod 상세 조회 (Unit 포함)
   */
  async findTrainingPeriodById(id: number) {
    return prisma.trainingPeriod.findUnique({
      where: { id },
      include: { unit: { select: { id: true, name: true } } },
    });
  }

  /**
   * TrainingPeriod 삭제 (cascade로 schedules, locations도 삭제됨)
   */
  async deleteTrainingPeriod(id: number) {
    return prisma.trainingPeriod.delete({
      where: { id },
    });
  }

  /**
   * TrainingPeriod 생성 (schedules, locations 포함)
   */
  async createTrainingPeriod(
    unitId: number,
    data: {
      name: string;
      workStartTime?: Date | null;
      workEndTime?: Date | null;
      lunchStartTime?: Date | null;
      lunchEndTime?: Date | null;
      officerName?: string | null;
      officerPhone?: string | null;
      officerEmail?: string | null;
      hasCateredMeals?: boolean;
      hasHallLodging?: boolean;
      allowsPhoneBeforeAfter?: boolean;
      locations?: {
        originalPlace?: string;
        changedPlace?: string | null;
        hasInstructorLounge?: boolean;
        hasWomenRestroom?: boolean;
        note?: string | null;
      }[];
      schedules?: { date: string | Date }[];
    },
  ) {
    return prisma.trainingPeriod.create({
      data: {
        unitId,
        name: data.name,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        lunchStartTime: data.lunchStartTime,
        lunchEndTime: data.lunchEndTime,
        officerName: data.officerName,
        officerPhone: data.officerPhone,
        officerEmail: data.officerEmail,
        hasCateredMeals: data.hasCateredMeals ?? false,
        hasHallLodging: data.hasHallLodging ?? false,
        allowsPhoneBeforeAfter: data.allowsPhoneBeforeAfter ?? false,
        locations: data.locations
          ? {
              create: data.locations.map((l) => ({
                originalPlace: l.originalPlace || '',
                changedPlace: l.changedPlace || null,
                hasInstructorLounge: l.hasInstructorLounge ?? false,
                hasWomenRestroom: l.hasWomenRestroom ?? false,
                note: l.note || null,
              })),
            }
          : undefined,
        schedules: data.schedules
          ? {
              create: data.schedules.map((s) => ({
                date: toUTCMidnight(s.date),
              })),
            }
          : undefined,
      },
      include: {
        locations: true,
        schedules: true,
      },
    });
  }

  /**
   * TrainingPeriod의 장소 목록 조회
   */
  async findLocationsByPeriodId(trainingPeriodId: number) {
    return prisma.trainingLocation.findMany({
      where: { trainingPeriodId },
    });
  }

  /**
   * 장소 삭제
   */
  async deleteLocation(id: number) {
    return prisma.trainingLocation.delete({
      where: { id },
    });
  }

  /**
   * 장소 업데이트
   */
  async updateLocation(id: number, data: Prisma.TrainingLocationUpdateInput) {
    return prisma.trainingLocation.update({
      where: { id },
      data,
    });
  }

  /**
   * 장소 생성
   */
  async createLocation(
    trainingPeriodId: number,
    data: {
      originalPlace: string;
      changedPlace?: string | null;
      hasInstructorLounge?: boolean;
      hasWomenRestroom?: boolean;
      note?: string | null;
    },
  ) {
    return prisma.trainingLocation.create({
      data: {
        trainingPeriodId,
        originalPlace: data.originalPlace,
        changedPlace: data.changedPlace || null,
        hasInstructorLounge: data.hasInstructorLounge ?? false,
        hasWomenRestroom: data.hasWomenRestroom ?? false,
        note: data.note || null,
      },
    });
  }
}

export default new UnitRepository();

// CommonJS 호환
module.exports = new UnitRepository();
