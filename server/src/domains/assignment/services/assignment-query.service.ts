// server/src/domains/assignment/services/assignment-query.service.ts
// 배정 조회 전용 서비스 (CQRS - Query)

import assignmentRepository from '../assignment.repository';
import instructorRepository from '../../instructor/instructor.repository';
import prisma from '../../../libs/prisma';
import {
  cacheInstructors,
  cacheUnits,
  getCachedInstructors,
  getCachedUnits,
} from '../../../libs/cache';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../engine/config-loader';
import type { UnitRaw, InstructorRaw } from '../../../types/assignment.types';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

class AssignmentQueryService {
  /**
   * 시스템 설정 숫자 값 조회 (DB 우선, 없으면 기본값)
   */
  async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const cfg = await prisma.systemConfig.findUnique({ where: { key } });
    if (!cfg?.value) return defaultValue;
    const parsed = Number(cfg.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  /**
   * 강사당 교육생 수 조회 (공개 메서드)
   */
  async getTraineesPerInstructor(): Promise<number> {
    return this.getSystemConfigNumber(
      'TRAINEES_PER_INSTRUCTOR',
      DEFAULT_ASSIGNMENT_CONFIG.traineesPerInstructor,
    );
  }

  /**
   * 배정 후보 데이터 조회 (Cache-First 패턴)
   */
  async getAssignmentCandidatesWithCache(startDate: string, endDate: string, _userId: number) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    // 1) 날짜 범위에 해당하는 부대 ID 목록 조회
    const unitIdsResult = await prisma.unit.findMany({
      where: {
        trainingPeriods: {
          some: {
            schedules: {
              some: {
                date: { gte: start, lte: end },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    const unitIds = unitIdsResult.map((u) => u.id);

    // 2) 캐시에서 부대 데이터 조회
    const { cached: cachedUnits, missingIds: missingUnitIds } = await getCachedUnits(unitIds);

    // 3) MISS된 부대만 DB 조회
    let unitsFromDb: typeof cachedUnits = [];
    if (missingUnitIds.length > 0) {
      const dbUnits = await assignmentRepository.findScheduleCandidates(startDate, endDate, {
        unitIds: missingUnitIds,
      });
      await cacheUnits(
        dbUnits.map((u) => ({
          id: u.id,
          name: u.name,
          region: u.region,
          wideArea: u.wideArea,
          trainingPeriods: u.trainingPeriods,
        })),
      );
      unitsFromDb = dbUnits as unknown as typeof cachedUnits;
    }

    // 4) 캐시 + DB 결과 병합
    const allUnits = [...cachedUnits, ...unitsFromDb];

    // 5) 스케줄 날짜 범위 계산
    let minScheduleDate = start;
    let maxScheduleDate = end;
    for (const unit of allUnits) {
      const periods = (unit as Record<string, unknown>).trainingPeriods as Array<{
        schedules?: Array<{ date?: Date | string }>;
      }>;
      const schedules = periods?.[0]?.schedules || [];
      for (const schedule of schedules) {
        if (!schedule.date) continue;
        const scheduleDate = new Date(schedule.date);
        if (scheduleDate < minScheduleDate) minScheduleDate = scheduleDate;
        if (scheduleDate > maxScheduleDate) maxScheduleDate = scheduleDate;
      }
    }

    const actualDateRangeStr = {
      startDate: minScheduleDate.toISOString().split('T')[0],
      endDate: maxScheduleDate.toISOString().split('T')[0],
    };

    // 6) 강사 ID 목록 조회
    const instructorIdsResult = await prisma.instructor.findMany({
      where: {
        availabilities: {
          some: {
            availableOn: { gte: minScheduleDate, lte: maxScheduleDate },
          },
        },
        user: { status: 'APPROVED' },
      },
      select: { userId: true },
    });
    const instructorIds = instructorIdsResult.map((i) => i.userId);

    // 7) 캐시에서 강사 데이터 조회
    const { cached: cachedInstructors, missingIds: missingInstructorIds } =
      await getCachedInstructors(instructorIds);

    // 8) MISS된 강사만 DB 조회
    let instructorsFromDb: typeof cachedInstructors = [];
    if (missingInstructorIds.length > 0) {
      const dbInstructors = await instructorRepository.findAvailableInPeriod(
        actualDateRangeStr.startDate,
        actualDateRangeStr.endDate,
        { userIds: missingInstructorIds },
      );
      await cacheInstructors(
        dbInstructors.map((i) => ({
          userId: i.userId,
          name: i.user?.name,
          category: i.category,
          teamId: i.teamId,
          teamName: i.team?.name,
          isTeamLeader: i.isTeamLeader,
          generation: i.generation,
          restrictedArea: i.restrictedArea,
          availableDates: i.availabilities?.map((a) => a.availableOn) || [],
          priorityCredits: i.priorityCredit?.credits || 0,
        })),
      );
      instructorsFromDb = dbInstructors as unknown as typeof cachedInstructors;
    }

    // 9) 캐시 + DB 결과 병합
    const allInstructors = [...cachedInstructors, ...instructorsFromDb];

    return {
      unitsRaw: allUnits as unknown as UnitRaw[],
      instructorsRaw: allInstructors as unknown as InstructorRaw[],
      actualDateRange: actualDateRangeStr,
    };
  }

  /**
   * 근무 이력 조회 (Confirmed + Past)
   */
  async getWorkHistory(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentRepository.findAllByInstructorId(instructorId, {
      state: 'Accepted',
      UnitSchedule: { date: { lt: today } },
    });
  }

  /**
   * 배정 목록 조회 (Active + Future)
   */
  async getUpcomingAssignments(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentRepository.findAllByInstructorId(instructorId, {
      state: { in: ['Pending', 'Accepted'] },
      UnitSchedule: { date: { gte: today } },
    });
  }

  /**
   * 내 배정 목록 조회 (강사용 - 메시지함에서 사용)
   */
  async getMyAssignments(userId: number) {
    return await assignmentRepository.getMyAssignments(userId);
  }
}

export const assignmentQueryService = new AssignmentQueryService();
export default assignmentQueryService;
