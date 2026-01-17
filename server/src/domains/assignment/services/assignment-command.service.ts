// server/src/domains/assignment/services/assignment-command.service.ts
// 배정 실행/저장 전용 서비스 (CQRS - Command)

import {
  assignmentQueryRepository,
  assignmentCommandRepository,
  assignmentConfigRepository,
} from '../repositories';
import instructorRepository from '../../instructor/instructor.repository';
import AppError from '../../../common/errors/AppError';
import assignmentAlgorithm from '../engine/adapter';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../engine/config-loader';
import type { TrainingLocationRaw, ScheduleLocationRaw } from '../../../types/assignment.types';

// =============================================================================
// Local Types (TrainingPeriod 구조 반영)
// =============================================================================

interface AlgorithmScheduleLocation {
  unitScheduleId: number;
  trainingLocationId: number;
  plannedCount?: number | null;
  actualCount?: number | null;
  requiredCount?: number | null;
}

interface AlgorithmTrainingLocation {
  id: number | string;
  originalPlace: string | null;
  actualCount: number | null;
  plannedCount: number | null;
  requiredCount: number | null;
  scheduleLocations?: AlgorithmScheduleLocation[];
}

interface AlgorithmSchedule {
  id: number;
  date: Date | null;
  assignments?: unknown[];
  scheduleLocations?: AlgorithmScheduleLocation[];
}

interface AlgorithmTrainingPeriod {
  id: number;
  isStaffLocked: boolean;
  excludedDates: string[];
  locations: AlgorithmTrainingLocation[];
  schedules: AlgorithmSchedule[];
}

interface AlgorithmUnitData {
  id: number;
  name: string | null | undefined;
  region: string | null | undefined;
  wideArea: string | null | undefined;
  trainingPeriods: AlgorithmTrainingPeriod[];
}

class AssignmentCommandService {
  /**
   * 시스템 설정 숫자 값 조회
   */
  private async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const value = await assignmentConfigRepository.getSystemConfigValue(key);
    if (!value) return defaultValue;
    const parsed = Number(value);
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
    await assignmentConfigRepository.consumePriorityCredit(instructorId);
  }

  /**
   * 교육기간 ID 기반 자동 배정 (클라이언트에서 trainingPeriodIds 전송)
   */
  async createAutoAssignmentsByPeriodIds(trainingPeriodIds: number[], instructorIds: number[]) {
    if (!trainingPeriodIds || trainingPeriodIds.length === 0) {
      throw new AppError('배정할 교육기간 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }
    if (!instructorIds || instructorIds.length === 0) {
      throw new AppError('배정할 강사 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 1) 교육기간 ID로 스케줄 조회
    const schedules =
      await assignmentQueryRepository.findSchedulesByTrainingPeriodIds(trainingPeriodIds);
    if (!schedules || schedules.length === 0) {
      throw new AppError('조회되는 스케줄이 없습니다.', 404, 'NO_SCHEDULES');
    }

    // 스케줄 ID 추출하여 기존 로직 재사용
    const scheduleIds = schedules.map((s) => s.id);
    return this.createAutoAssignmentsByIds(scheduleIds, instructorIds);
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
    const schedules = await assignmentQueryRepository.findSchedulesByIds(scheduleIds);
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

    // 3) 강사 조회 (DB 직접)
    const instructors = await instructorRepository.findAvailableInPeriod(
      minDate.toISOString(),
      maxDate.toISOString(),
      { userIds: instructorIds },
    );
    if (!instructors || instructors.length === 0) {
      throw new AppError('배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    // 4) Unit Map 구성 (TrainingPeriod 단위)
    const unitMap = new Map<number, AlgorithmUnitData>();
    const periodMap = new Map<number, AlgorithmTrainingPeriod>();

    for (const schedule of schedules) {
      const period = schedule.trainingPeriod;
      const unitId = period?.unitId;
      const periodId = period?.id;
      if (!unitId || !periodId) continue;

      // Unit 초기화
      if (!unitMap.has(unitId)) {
        unitMap.set(unitId, {
          id: unitId,
          name: period.unit?.name,
          region: period.unit?.region,
          wideArea: period.unit?.wideArea,
          trainingPeriods: [],
        });
      }

      // TrainingPeriod 초기화
      if (!periodMap.has(periodId)) {
        const locations: AlgorithmTrainingLocation[] =
          period.locations?.map((loc: TrainingLocationRaw) => {
            const schedLoc = schedule.scheduleLocations?.find(
              (sl: ScheduleLocationRaw) => sl.trainingLocationId === loc.id,
            );
            return {
              id: loc.id,
              originalPlace: loc.originalPlace,
              actualCount: schedLoc?.actualCount ?? null,
              plannedCount: schedLoc?.plannedCount ?? null,
              requiredCount: schedLoc?.requiredCount ?? null,
              scheduleLocations: loc.scheduleLocations || [],
            };
          }) || [];

        const periodData: AlgorithmTrainingPeriod = {
          id: periodId,
          isStaffLocked: period.isStaffLocked ?? false,
          excludedDates: (period.excludedDates as string[]) || [],
          locations,
          schedules: [],
        };
        periodMap.set(periodId, periodData);

        // Unit에 period 추가
        const unitData = unitMap.get(unitId)!;
        unitData.trainingPeriods.push(periodData);
      }

      // Schedule 추가
      const periodData = periodMap.get(periodId)!;
      periodData.schedules.push({
        id: schedule.id,
        date: schedule.date,
        assignments: schedule.assignments || [],
        scheduleLocations: schedule.scheduleLocations || [],
      });
    }
    const units = Array.from(unitMap.values());

    // 5) 통계 조회 및 알고리즘 실행
    const blockedInstructorIdsBySchedule =
      await assignmentQueryRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

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
      await assignmentQueryRepository.getInstructorRecentStats(
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
    const summary = await assignmentCommandRepository.createAssignmentsBulk(matchResults);

    const assignedInstructorIds = new Set(matchResults.map((m) => m.instructorId));
    for (const instructorId of assignedInstructorIds) {
      await this.consumePriorityCredit(instructorId);
    }

    const affectedUnitIds = new Set(units.map((u) => u.id));
    for (const unitId of affectedUnitIds) {
      await assignmentCommandRepository.recalculateRolesForUnit(unitId);
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

    const units = await assignmentQueryRepository.findScheduleCandidates(start, end);
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
      await assignmentQueryRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

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
      await assignmentQueryRepository.getInstructorRecentStats(
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
    const summary = await assignmentCommandRepository.createAssignmentsBulk(assignments);
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
    const result = await assignmentCommandRepository.batchUpdateAssignments(changes);

    if (!changes.roleChanges || changes.roleChanges.length === 0) {
      const scheduleIds = [
        ...changes.add.map((a) => a.unitScheduleId),
        ...changes.remove.map((r) => r.unitScheduleId),
      ];

      if (scheduleIds.length > 0) {
        const unitIds = new Set<number>();
        for (const scheduleId of scheduleIds) {
          const unitId = await assignmentQueryRepository.getUnitIdByScheduleId(scheduleId);
          if (unitId) unitIds.add(unitId);
        }

        for (const unitId of unitIds) {
          await assignmentCommandRepository.recalculateRolesForUnit(unitId);
        }
      }
    }

    return result;
  }

  /**
   * 부대 인원고정 설정/해제
   */
  async toggleStaffLock(unitId: number, isStaffLocked: boolean) {
    const result = await assignmentCommandRepository.toggleStaffLock(unitId, isStaffLocked);
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
    return await assignmentCommandRepository.updateRoleForUnit(unitId, instructorId, role);
  }
}

export const assignmentCommandService = new AssignmentCommandService();
export default assignmentCommandService;
