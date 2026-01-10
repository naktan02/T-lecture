// server/src/domains/assignment/services/assignment-command.service.ts
// 배정 실행/저장 전용 서비스 (CQRS - Command)

import assignmentRepository from '../assignment.repository';
import instructorRepository from '../../instructor/instructor.repository';
import AppError from '../../../common/errors/AppError';
import assignmentAlgorithm from '../engine/adapter';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../engine/config-loader';
import prisma from '../../../libs/prisma';
import { cacheInstructors, getCachedInstructors } from '../../../libs/cache';
import type {
  InstructorRaw,
  TrainingLocationRaw,
  ScheduleLocationRaw,
} from '../../../types/assignment.types';

// =============================================================================
// Local Types
// =============================================================================

interface AlgorithmUnitData {
  id: number;
  name: string | null | undefined;
  region: string | null | undefined;
  wideArea: string | null | undefined;
  trainingLocations: Array<{
    id: number | string;
    originalPlace: string | null;
    actualCount: number | null;
    plannedCount: number | null;
    requiredCount: number | null;
  }>;
  schedules: Array<{
    id: number;
    date: Date | null;
    assignments: unknown[];
  }>;
  isStaffLocked: boolean;
}

class AssignmentCommandService {
  /**
   * 시스템 설정 숫자 값 조회
   */
  private async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const cfg = await prisma.systemConfig.findUnique({ where: { key } });
    if (!cfg?.value) return defaultValue;
    const parsed = Number(cfg.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  /**
   * 날짜에서 월 빼기 유틸
   */
  private subtractMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() - months);
    return d;
  }

  /**
   * 우선배정 크레딧 소모
   */
  private async consumePriorityCredit(instructorId: number) {
    const existing = await prisma.instructorPriorityCredit.findUnique({
      where: { instructorId },
    });

    if (!existing || existing.credits <= 0) return;

    if (existing.credits <= 1) {
      await prisma.instructorPriorityCredit.delete({ where: { instructorId } });
    } else {
      await prisma.instructorPriorityCredit.update({
        where: { instructorId },
        data: { credits: existing.credits - 1 },
      });
    }
  }

  /**
   * ID 기반 자동 배정 (하이브리드 방식)
   */
  async createAutoAssignmentsByIds(scheduleIds: number[], instructorIds: number[]) {
    if (!scheduleIds || scheduleIds.length === 0) {
      throw new AppError('배정할 스케줄 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }
    if (!instructorIds || instructorIds.length === 0) {
      throw new AppError('배정할 강사 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 1) 스케줄 조회
    const schedules = await assignmentRepository.findSchedulesByIds(scheduleIds);
    if (!schedules || schedules.length === 0) {
      throw new AppError('조회되는 스케줄이 없습니다.', 404, 'NO_SCHEDULES');
    }

    // 2) 날짜 범위 계산
    const validSchedules = schedules.filter((s) => s.date !== null);
    if (validSchedules.length === 0) {
      throw new AppError('유효한 날짜가 있는 스케줄이 없습니다.', 404, 'NO_VALID_SCHEDULES');
    }

    let minDate = new Date(validSchedules[0].date!);
    let maxDate = new Date(validSchedules[0].date!);
    for (const schedule of validSchedules) {
      const d = new Date(schedule.date!);
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    }

    // 3) 강사 조회 (Cache-First)
    const { cached: cachedInstructors, missingIds: missingInstructorIds } =
      await getCachedInstructors(instructorIds);

    let instructorsFromDb: typeof cachedInstructors = [];
    if (missingInstructorIds.length > 0) {
      const dbInstructors = await instructorRepository.findAvailableInPeriod(
        minDate.toISOString(),
        maxDate.toISOString(),
        { userIds: missingInstructorIds },
      );
      await cacheInstructors(
        dbInstructors.map((i: InstructorRaw) => ({
          userId: i.userId,
          name: i.user?.name,
          category: i.category,
          teamId: (i as { teamId?: number | null }).teamId ?? null,
          teamName: i.team?.name,
          isTeamLeader: i.isTeamLeader ?? false,
          generation: i.generation ?? null,
          restrictedArea: i.restrictedArea ?? null,
          availableDates: i.availabilities?.map((a) => a.availableOn) || [],
          priorityCredits:
            (i as { priorityCredit?: { credits: number } }).priorityCredit?.credits || 0,
        })),
      );
      instructorsFromDb = dbInstructors as unknown as typeof cachedInstructors;
    }

    const instructors = [...cachedInstructors, ...instructorsFromDb];
    if (!instructors || instructors.length === 0) {
      throw new AppError('배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    // 4) Unit Map 구성
    const unitMap = new Map<number, AlgorithmUnitData>();
    for (const schedule of schedules) {
      const unitId = schedule.trainingPeriod?.unitId;
      if (!unitId) continue;

      if (!unitMap.has(unitId)) {
        const locations =
          schedule.trainingPeriod?.locations?.map((loc: TrainingLocationRaw) => {
            const schedLoc = schedule.scheduleLocations?.find(
              (sl: ScheduleLocationRaw) => sl.trainingLocationId === loc.id,
            );
            return {
              id: loc.id,
              originalPlace: loc.originalPlace,
              actualCount: schedLoc?.actualCount ?? null,
              plannedCount: schedLoc?.plannedCount ?? null,
              requiredCount: schedLoc?.requiredCount ?? null,
            };
          }) || [];

        unitMap.set(unitId, {
          id: unitId,
          name: schedule.trainingPeriod?.unit?.name,
          region: schedule.trainingPeriod?.unit?.region,
          wideArea: schedule.trainingPeriod?.unit?.wideArea,
          trainingLocations: locations,
          schedules: [],
          isStaffLocked: schedule.trainingPeriod?.isStaffLocked ?? false,
        });
      }

      const unitData = unitMap.get(unitId);
      if (unitData) {
        unitData.schedules.push({
          id: schedule.id,
          date: schedule.date,
          assignments: schedule.assignments || [],
        });
      }
    }
    const units = Array.from(unitMap.values());

    // 5) 통계 조회 및 알고리즘 실행
    const blockedInstructorIdsBySchedule =
      await assignmentRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

    const traineesPerInstructor = await this.getSystemConfigNumber('TRAINEES_PER_INSTRUCTOR', 36);
    const fairnessLookbackMonths = await this.getSystemConfigNumber(
      'FAIRNESS_LOOKBACK_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.fairnessLookbackMonths,
    );
    const rejectionPenaltyMonths = await this.getSystemConfigNumber(
      'REJECTION_PENALTY_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.rejectionPenaltyMonths,
    );

    const assignmentSince = this.subtractMonths(minDate, fairnessLookbackMonths);
    const rejectionSince = this.subtractMonths(minDate, rejectionPenaltyMonths);

    const { recentAssignmentCountByInstructorId, recentRejectionCountByInstructorId } =
      await assignmentRepository.getInstructorRecentStats(
        instructorIds,
        assignmentSince,
        rejectionSince,
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchResult = assignmentAlgorithm.execute(units as any, instructors as any, {
      traineesPerInstructor,
      blockedInstructorIdsBySchedule,
      recentAssignmentCountByInstructorId,
      recentRejectionCountByInstructorId,
    });

    const { assignments: matchResults } = matchResult;
    if (!matchResults || matchResults.length === 0) {
      throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
    }

    // 6) 저장 및 후처리
    const summary = await assignmentRepository.createAssignmentsBulk(matchResults);

    const assignedInstructorIds = new Set(matchResults.map((m) => m.instructorId));
    for (const instructorId of assignedInstructorIds) {
      await this.consumePriorityCredit(instructorId);
    }

    const affectedUnitIds = new Set(units.map((u) => u.id));
    for (const unitId of affectedUnitIds) {
      await assignmentRepository.recalculateRolesForUnit(unitId);
    }

    return { summary };
  }

  /**
   * 자동 배정 미리보기 (저장 안 함)
   */
  async previewAutoAssignments(startDate: Date, endDate: Date, debugTopK = 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
    }
    if (start > end) {
      throw new AppError('시작일은 종료일보다 클 수 없습니다.', 400, 'VALIDATION_ERROR');
    }

    const units = await assignmentRepository.findScheduleCandidates(start, end);
    if (!units || units.length === 0) {
      throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
    }

    // 날짜 범위 계산
    let minScheduleDate = start;
    let maxScheduleDate = end;
    for (const unit of units) {
      const schedules = unit.trainingPeriods?.flatMap((p) => p.schedules) || [];
      for (const schedule of schedules) {
        if (!schedule.date) continue;
        const scheduleDate = new Date(schedule.date);
        if (scheduleDate < minScheduleDate) minScheduleDate = scheduleDate;
        if (scheduleDate > maxScheduleDate) maxScheduleDate = scheduleDate;
      }
    }

    const instructors = await instructorRepository.findAvailableInPeriod(
      minScheduleDate.toISOString(),
      maxScheduleDate.toISOString(),
    );

    if (!instructors || instructors.length === 0) {
      throw new AppError('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    const traineesPerInstructor = await this.getSystemConfigNumber('TRAINEES_PER_INSTRUCTOR', 36);
    const scheduleIds = Array.from(
      new Set(
        units.flatMap((u) =>
          (u.trainingPeriods?.flatMap((p) => p.schedules) || []).map((s) => s.id),
        ),
      ),
    );
    const blockedInstructorIdsBySchedule =
      await assignmentRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

    const fairnessLookbackMonths = await this.getSystemConfigNumber(
      'FAIRNESS_LOOKBACK_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.fairnessLookbackMonths,
    );
    const rejectionPenaltyMonths = await this.getSystemConfigNumber(
      'REJECTION_PENALTY_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.rejectionPenaltyMonths,
    );
    const instructorIds = Array.from(new Set(instructors.map((i: { userId: number }) => i.userId)));
    const assignmentSince = this.subtractMonths(start, fairnessLookbackMonths);
    const rejectionSince = this.subtractMonths(start, rejectionPenaltyMonths);

    const { recentAssignmentCountByInstructorId, recentRejectionCountByInstructorId } =
      await assignmentRepository.getInstructorRecentStats(
        instructorIds,
        assignmentSince,
        rejectionSince,
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchResult = assignmentAlgorithm.execute(units as any, instructors as any, {
      traineesPerInstructor,
      blockedInstructorIdsBySchedule,
      recentAssignmentCountByInstructorId,
      recentRejectionCountByInstructorId,
      debugTopK,
    });

    const { assignments: matchResults, debug } = matchResult;
    if (!matchResults || matchResults.length === 0) {
      throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
    }

    return {
      previewAssignments: matchResults,
      assignedCount: matchResults.length,
      debug,
    };
  }

  /**
   * 배정 일괄 저장
   */
  async bulkSaveAssignments(
    assignments: Array<{
      unitScheduleId: number;
      instructorId: number;
      trainingLocationId?: number | null;
    }>,
  ) {
    if (!assignments || assignments.length === 0) {
      throw new AppError('저장할 배정이 없습니다.', 400, 'VALIDATION_ERROR');
    }
    const summary = await assignmentRepository.createAssignmentsBulk(assignments);
    return { summary };
  }

  /**
   * 일괄 배정 업데이트 (트랜잭션)
   */
  async batchUpdateAssignments(changes: {
    add: Array<{ unitScheduleId: number; instructorId: number; trainingLocationId: number | null }>;
    remove: Array<{ unitScheduleId: number; instructorId: number }>;
    roleChanges?: Array<{
      unitId: number;
      instructorId: number;
      role: 'Head' | 'Supervisor' | null;
    }>;
    staffLockChanges?: Array<{
      unitId: number;
      isStaffLocked: boolean;
    }>;
  }) {
    const result = await assignmentRepository.batchUpdateAssignments(changes);

    if (!changes.roleChanges || changes.roleChanges.length === 0) {
      const scheduleIds = [
        ...changes.add.map((a) => a.unitScheduleId),
        ...changes.remove.map((r) => r.unitScheduleId),
      ];

      if (scheduleIds.length > 0) {
        const unitIds = new Set<number>();
        for (const scheduleId of scheduleIds) {
          const unitId = await assignmentRepository.getUnitIdByScheduleId(scheduleId);
          if (unitId) unitIds.add(unitId);
        }

        for (const unitId of unitIds) {
          await assignmentRepository.recalculateRolesForUnit(unitId);
        }
      }
    }

    return result;
  }

  /**
   * 부대 인원고정 설정/해제
   */
  async toggleStaffLock(unitId: number, isStaffLocked: boolean) {
    const result = await assignmentRepository.toggleStaffLock(unitId, isStaffLocked);
    // 자동 확정 체크는 response service에서 처리 필요
    return result;
  }

  /**
   * 역할 변경 (관리자용)
   */
  async updateRoleForUnit(
    unitId: number,
    instructorId: number,
    role: 'Head' | 'Supervisor' | null,
  ) {
    return await assignmentRepository.updateRoleForUnit(unitId, instructorId, role);
  }
}

export const assignmentCommandService = new AssignmentCommandService();
export default assignmentCommandService;
