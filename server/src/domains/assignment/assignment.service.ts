// server/src/domains/assignment/assignment.service.ts
import assignmentRepository from './assignment.repository';
import instructorRepository from '../instructor/instructor.repository';
import AppError from '../../common/errors/AppError';
import assignmentAlgorithm from './assignment.algorithm';
import assignmentDTO from './assignment.dto';
import { DEFAULT_ASSIGNMENT_CONFIG } from './engine/config-loader';
import prisma from '../../libs/prisma';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
  /**
   * 시스템 설정 숫자 값 조회 (DB 우선, 없으면 기본값)
   */
  private async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
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
   * 날짜에서 월 빼기 유틸
   */
  private subtractMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() - months);
    return d;
  }

  /**
   * 배정 후보 데이터 조회 (Raw Data 반환)
   * - 부대 전체 일정 범위를 계산하여 actualDateRange 반환
   * - 강사 가용일도 해당 범위로 조회
   */
  async getAssignmentCandidatesRaw(startDate: string, endDate: string) {
    // 날짜 문자열을 UTC 자정으로 변환 (DB 저장 형식과 일치)
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    // 1) 부대 조회
    const unitsRaw = await assignmentRepository.findScheduleCandidates(start, end);

    // 2) 부대의 실제 스케줄 날짜 범위 계산
    let minScheduleDate = start;
    let maxScheduleDate = end;
    for (const unit of unitsRaw) {
      const schedules = unit.trainingPeriods?.[0]?.schedules || [];
      for (const schedule of schedules) {
        if (!schedule.date) continue;
        const scheduleDate = new Date(schedule.date);
        if (scheduleDate < minScheduleDate) minScheduleDate = scheduleDate;
        if (scheduleDate > maxScheduleDate) maxScheduleDate = scheduleDate;
      }
    }

    // 3) 강사 가용일은 부대의 실제 스케줄 범위로 조회
    const instructorsRaw = await instructorRepository.findAvailableInPeriod(
      minScheduleDate.toISOString(),
      maxScheduleDate.toISOString(),
    );

    // 4) 실제 날짜 범위 반환 (클라이언트에서 임시 발송 시 사용)
    const actualDateRange = {
      startDate: minScheduleDate.toISOString().split('T')[0],
      endDate: maxScheduleDate.toISOString().split('T')[0],
    };

    return { unitsRaw, instructorsRaw, actualDateRange };
  }

  async createAutoAssignments(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('유효하지 않은 날짜 형식입니다.', 400, 'VALIDATION_ERROR');
    }
    if (start > end) {
      throw new AppError('시작일은 종료일보다 클 수 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 1) 데이터 준비 - 부대 조회 먼저
    const units = await assignmentRepository.findScheduleCandidates(start, end);

    if (!units || units.length === 0) {
      throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
    }

    // 부대의 실제 스케줄 날짜 범위 계산 (부대 전체 일정 커버)
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

    // 강사 가능일은 부대의 실제 스케줄 범위로 조회
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

    // ===== 최근 통계(공정성/패널티) =====
    // 엔진 config에서 사용 중인 값과 맞춰서 우선 하드코딩(추후 SystemConfig로 빼도 됨)
    // NOTE: 운영 중 튜닝 가능한 값들은 SystemConfig에서 가져오고, 없으면 기본값을 사용한다.
    const fairnessLookbackMonths = await this.getSystemConfigNumber(
      'FAIRNESS_LOOKBACK_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.fairnessLookbackMonths,
    );
    const rejectionPenaltyMonths = await this.getSystemConfigNumber(
      'REJECTION_PENALTY_MONTHS',
      DEFAULT_ASSIGNMENT_CONFIG.rejectionPenaltyMonths,
    );
    const instructorIds = Array.from(new Set(instructors.map((i: any) => i.userId)));
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
    });

    const { assignments: matchResults } = matchResult;

    if (!matchResults || matchResults.length === 0) {
      throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
    }

    const summary = await assignmentRepository.createAssignmentsBulk(matchResults);

    // 배정된 강사의 우선배정 크레딧 소모
    const assignedInstructorIds = new Set(matchResults.map((m) => m.instructorId));
    for (const instructorId of assignedInstructorIds) {
      await this.consumePriorityCredit(instructorId);
    }

    // 배정된 모든 부대에 대해 역할(Head/Supervisor) 재계산
    const affectedUnitIds = new Set(units.map((u) => u.id));
    for (const unitId of affectedUnitIds) {
      await assignmentRepository.recalculateRolesForUnit(unitId);
    }

    const updatedUnits = await assignmentRepository.findScheduleCandidates(start, end);
    return {
      summary,
      data: assignmentDTO.toHierarchicalResponse(updatedUnits),
    };
  }

  /**
   * ID 기반 자동 배정 (하이브리드 방식)
   * - 클라이언트에서 scheduleIds, instructorIds 전달받음
   * - 기배정 상태는 서버에서 실시간 조회
   */
  async createAutoAssignmentsByIds(scheduleIds: number[], instructorIds: number[]) {
    if (!scheduleIds || scheduleIds.length === 0) {
      throw new AppError('배정할 스케줄 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }
    if (!instructorIds || instructorIds.length === 0) {
      throw new AppError('배정할 강사 ID가 없습니다.', 400, 'VALIDATION_ERROR');
    }

    // 1) 스케줄 조회 (기배정 상태 포함)
    const schedules = await assignmentRepository.findSchedulesByIds(scheduleIds);

    if (!schedules || schedules.length === 0) {
      throw new AppError('조회되는 스케줄이 없습니다.', 404, 'NO_SCHEDULES');
    }

    // 2) 스케줄 날짜 범위 계산 (강사 가용일 조회용)
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

    // 3) 강사 조회 (ID 필터링 + 가용일 조회)
    const allInstructors = await instructorRepository.findAvailableInPeriod(
      minDate.toISOString(),
      maxDate.toISOString(),
    );
    // 클라이언트에서 전달받은 ID로 필터링
    const instructors = allInstructors.filter((i: any) => instructorIds.includes(i.userId));

    if (!instructors || instructors.length === 0) {
      throw new AppError('배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    // 4) 스케줄 데이터를 기존 알고리즘 형식으로 변환 (Unit 기반)
    // 알고리즘 인터페이스: { id, name, region, wideArea, schedules, trainingLocations, isStaffLocked }
    const unitMap = new Map<number, any>();
    for (const schedule of schedules) {
      const unitId = schedule.trainingPeriod?.unitId;
      if (!unitId) continue;

      if (!unitMap.has(unitId)) {
        // 장소 정보 추출 (scheduleLocations에서 actualCount/plannedCount 포함)
        const locations =
          schedule.trainingPeriod?.locations?.map((loc: any) => {
            // scheduleLocations에서 해당 장소의 인원 정보 가져오기
            const schedLoc = schedule.scheduleLocations?.find(
              (sl: any) => sl.trainingLocationId === loc.id,
            );
            return {
              id: loc.id,
              originalPlace: loc.originalPlace,
              actualCount: schedLoc?.actualCount ?? null,
              plannedCount: schedLoc?.plannedCount ?? null,
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

      // 스케줄 추가 (assignments 포함)
      unitMap.get(unitId).schedules.push({
        id: schedule.id,
        date: schedule.date,
        assignments: schedule.assignments || [],
      });
    }
    const units = Array.from(unitMap.values());

    // 5) 취소된 강사 조회 (재배정 방지)
    const blockedInstructorIdsBySchedule =
      await assignmentRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

    // 6) 공정성/패널티 통계
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

    // 7) 배정 알고리즘 실행
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

    // 8) 배정 저장
    const summary = await assignmentRepository.createAssignmentsBulk(matchResults);

    // 9) 크레딧 소모 및 역할 재계산
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
   * @param startDate 시작일
   * @param endDate 종료일
   * @param debugTopK 디버그용 상위 K명 breakdown 수집 (0이면 수집 안 함)
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

    // 부대의 실제 스케줄 날짜 범위 계산 (부대 전체 일정 커버)
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

    // 강사 가능일은 부대의 실제 스케줄 범위로 조회
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
    const instructorIds = Array.from(new Set(instructors.map((i: any) => i.userId)));
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
      debugTopK, // 디버그용 상위 K명 breakdown 수집
    });

    const { assignments: matchResults, debug } = matchResult;

    if (!matchResults || matchResults.length === 0) {
      throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
    }

    // 미리보기용: 저장하지 않고 결과만 반환 (debug 포함 가능)
    return {
      previewAssignments: matchResults,
      assignedCount: matchResults.length,
      debug, // 디버그 정보 (있으면 포함)
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
   * 임시 배정 응답 (수락/거절)
   * 수락 시: 해당 스케줄의 필요 인원이 모두 수락하면 자동 확정
   */
  async respondToAssignment(
    instructorId: number,
    unitScheduleId: number | string,
    response: string,
  ) {
    const assignment = await assignmentRepository.findAssignmentByKey(
      instructorId,
      Number(unitScheduleId),
    );

    if (!assignment) {
      throw new AppError('해당 배정 정보를 찾을 수 없습니다.', 404, 'NOT_FOUND');
    }

    if (assignment.state === 'Accepted') {
      throw new AppError('이미 확정된 배정입니다.', 409, 'ALREADY_CONFIRMED');
    }
    if (['Canceled', 'Rejected'].includes(assignment.state)) {
      throw new AppError('이미 취소되거나 거절된 배정입니다.', 409, 'ALREADY_CANCELED');
    }

    let newState: string;
    if (response === 'ACCEPT') {
      newState = 'Accepted';
    } else if (response === 'REJECT') {
      newState = 'Rejected';
    } else {
      throw new AppError('잘못된 응답입니다. (ACCEPT 또는 REJECT)', 400, 'VALIDATION_ERROR');
    }

    await assignmentRepository.updateStatusByKey(instructorId, Number(unitScheduleId), newState);

    // 수락 시: 해당 스케줄의 자동 확정 체크
    if (newState === 'Accepted') {
      await this.checkAndAutoConfirm(Number(unitScheduleId));
    }

    // 거절 시: 패널티 추가 (사유 포함)
    if (newState === 'Rejected') {
      const penaltyDays = await this.getSystemConfigNumber('REJECTION_PENALTY_DAYS', 15);

      // 배정 정보에서 부대/날짜 가져오기
      const schedule = await prisma.unitSchedule.findUnique({
        where: { id: Number(unitScheduleId) },
        include: { trainingPeriod: { include: { unit: { select: { name: true } } } } },
      });
      const unitName = schedule?.trainingPeriod?.unit?.name || 'unknown';
      const dateStr = schedule?.date
        ? new Date(schedule.date).toISOString().split('T')[0]
        : 'unknown';

      await this.addPenaltyToInstructor(instructorId, penaltyDays, {
        unit: unitName,
        date: dateStr,
        type: '거절',
      });
    }

    return {
      message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
    };
  }

  /**
   * 강사에게 패널티 추가 (만료일 연장, 사유 포함)
   */
  private async addPenaltyToInstructor(
    instructorId: number,
    days: number,
    reason?: { unit: string; date: string; type: string },
  ) {
    const now = new Date();
    const existing = await prisma.instructorPenalty.findUnique({
      where: { userId: instructorId },
    });

    if (existing) {
      const baseDate = existing.expiresAt > now ? existing.expiresAt : now;
      const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
      const existingReasons = ((existing as any)?.reasons as Array<unknown>) || [];

      await prisma.instructorPenalty.update({
        where: { userId: instructorId },
        data: {
          count: { increment: 1 },
          expiresAt: newExpiresAt,
          reasons: reason ? [...existingReasons, reason] : existingReasons,
        } as any, // Prisma generate 후 제거
      });
    } else {
      await prisma.instructorPenalty.create({
        data: {
          userId: instructorId,
          count: 1,
          expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
          reasons: reason ? [reason] : [],
        } as any, // Prisma generate 후 제거
      });
    }
  }

  /**
   * 우선배정 크레딧 소모 (1 감소, 0이면 삭제)
   */
  private async consumePriorityCredit(instructorId: number) {
    const credit = await prisma.instructorPriorityCredit.findUnique({
      where: { instructorId },
    });

    if (!credit) return; // 크레딧 없으면 무시

    if (credit.credits <= 1) {
      // 크레딧 1개면 레코드 삭제
      await prisma.instructorPriorityCredit.delete({
        where: { instructorId },
      });
    } else {
      // 크레딧 감소
      await prisma.instructorPriorityCredit.update({
        where: { instructorId },
        data: { credits: { decrement: 1 } },
      });
    }
  }

  /**
   * 부대(Unit) 전체의 인원이 모두 수락되었는지 확인하고 자동 확정
   * - isStaffLocked=false: 수락 인원 >= 필요인원 AND Pending 없음
   * - isStaffLocked=true: Pending 없음 (필요인원 상관없이)
   */
  private async checkAndAutoConfirm(unitScheduleId: number) {
    // 1. 스케줄에서 부대 ID 조회
    const unitId = await assignmentRepository.getUnitIdByScheduleId(unitScheduleId);
    if (!unitId) return;

    // 2. 부대의 모든 정보 조회
    const unit = await assignmentRepository.getUnitWithAssignments(unitId);
    if (!unit) return;

    // 첫 번째 TrainingPeriod에서 정보 추출 (TrainingPeriod 기반 구조)
    const firstPeriod = unit.trainingPeriods[0];
    if (!firstPeriod) return;

    const allSchedules = firstPeriod.schedules;
    const allLocations = firstPeriod.locations;

    // 3. 배정이 하나라도 있는지 확인
    const hasAnyAssignment = allSchedules.some((s) => s.assignments.length > 0);
    if (!hasAnyAssignment) return;

    // 4. 부대의 인원고정 여부
    const isStaffLocked = firstPeriod.isStaffLocked ?? false;

    // 5. 장소별 필요 인원 합계 (동적 계산)
    const traineesPerInstructor = await this.getTraineesPerInstructor();
    const totalRequiredPerSchedule = allLocations.reduce((sum, loc) => {
      // scheduleLocations에서 actualCount 가져오기
      const actualCount = loc.scheduleLocations?.[0]?.actualCount || 0;
      return sum + (Math.floor(actualCount / Math.max(1, traineesPerInstructor)) || 1);
    }, 0);

    // 6. 모든 스케줄 충족 여부 확인
    let allSchedulesFilled = true;

    for (const schedule of allSchedules) {
      const acceptedCount = schedule.assignments.filter((a) => a.state === 'Accepted').length;
      const pendingCount = schedule.assignments.filter((a) => a.state === 'Pending').length;

      // 공통: Pending 있으면 미충족
      if (pendingCount > 0) {
        allSchedulesFilled = false;
        break;
      }

      // 인원고정 아님: 추가로 수락 >= 필요인원 체크 (최소 보장)
      if (!isStaffLocked && acceptedCount < totalRequiredPerSchedule) {
        allSchedulesFilled = false;
        break;
      }
    }

    // 7. 모든 조건 충족 시 부대 전체 확정
    if (allSchedulesFilled && allSchedules.length > 0) {
      await assignmentRepository.updateClassificationByUnit(unitId, 'Confirmed');
    }
  }

  /**
   * 관리자 배정 취소
   * 확정 상태에서 취소 시 해당 스케줄의 다른 배정들도 임시로 복귀
   * 수락 상태에서 취소 시 Rejected로 변경 (패널티 적용)
   */
  async cancelAssignment(
    userId: number,
    userRole: string,
    targetInstructorId: number,
    unitScheduleId: number,
  ) {
    const assignment = await assignmentRepository.findAssignmentByKey(
      targetInstructorId,
      unitScheduleId,
    );

    if (!assignment) {
      throw new AppError('배정 정보를 찾을 수 없습니다.', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    const isOwner = Number(targetInstructorId) === Number(userId);
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER';

    if (!isAdmin && !isOwner) {
      throw new AppError('이 배정을 취소할 권한이 없습니다.', 403, 'FORBIDDEN');
    }

    // 확정 상태였으면 해당 스케줄의 다른 배정들을 임시로 복귀
    const wasConfirmed = assignment.classification === 'Confirmed';

    // 수락 상태에서 취소 → Rejected (패널티 적용)
    // 그 외 상태에서 취소 → Canceled (패널티 없음)
    const newState = assignment.state === 'Accepted' ? 'Rejected' : 'Canceled';

    await assignmentRepository.updateStatusByKey(targetInstructorId, unitScheduleId, newState);

    // Rejected로 변경되면 패널티 추가
    if (newState === 'Rejected') {
      const penaltyDays = await this.getSystemConfigNumber('REJECTION_PENALTY_DAYS', 15);
      await this.addPenaltyToInstructor(targetInstructorId, penaltyDays);
    }

    // 확정에서 인원이 삭제되면 해당 스케줄의 배정들을 임시로 복귀
    if (wasConfirmed) {
      await assignmentRepository.updateClassificationBySchedule(unitScheduleId, 'Temporary');
    }

    // 역할(Head/Supervisor) 재계산 - 취소된 사람이 Head/Supervisor였다면 다음 사람에게 승계
    const unitId = await assignmentRepository.getUnitIdByScheduleId(unitScheduleId);
    if (unitId) {
      await assignmentRepository.recalculateRolesForUnit(unitId);
    }

    return {
      message:
        newState === 'Rejected'
          ? '배정이 거절 처리되었습니다. (패널티 적용)'
          : '배정이 취소되었습니다.',
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
   * 부대 인원고정 설정/해제
   */
  async toggleStaffLock(unitId: number, isStaffLocked: boolean) {
    const result = await assignmentRepository.toggleStaffLock(unitId, isStaffLocked);
    // 인원고정 후 자동 확정 체크
    const firstSchedule = await prisma.unitSchedule.findFirst({
      where: { trainingPeriod: { unitId } },
      select: { id: true },
    });
    if (firstSchedule) {
      await this.checkAndAutoConfirm(firstSchedule.id);
    }
    return result;
  }

  /**
   * 역할 변경 (관리자용)
   * unitId: 부대 ID
   * instructorId: 역할을 부여받을 강사 ID
   * role: 'Head' | 'Supervisor' | null
   */
  async updateRoleForUnit(
    unitId: number,
    instructorId: number,
    role: 'Head' | 'Supervisor' | null,
  ) {
    return await assignmentRepository.updateRoleForUnit(unitId, instructorId, role);
  }

  /**
   * 내 배정 목록 조회 (강사용 - 메시지함에서 사용)
   */
  async getMyAssignments(userId: number) {
    return await assignmentRepository.getMyAssignments(userId);
  }

  /**
   * 일괄 배정 업데이트 (트랜잭션)
   * 변경 후 역할 재계산 자동 실행 (roleChanges가 없는 경우만)
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

    // roleChanges가 있으면 수동 역할 변경이므로 자동 재계산 스킵
    // roleChanges가 없으면 기존처럼 자동 역할 재계산 실행
    if (!changes.roleChanges || changes.roleChanges.length === 0) {
      // 변경된 스케줄들의 unitId 수집 (중복 제거)
      const scheduleIds = [
        ...changes.add.map((a) => a.unitScheduleId),
        ...changes.remove.map((r) => r.unitScheduleId),
      ];

      if (scheduleIds.length > 0) {
        // 스케줄 ID -> unitId 조회
        const unitIds = new Set<number>();
        for (const scheduleId of scheduleIds) {
          const unitId = await assignmentRepository.getUnitIdByScheduleId(scheduleId);
          if (unitId) unitIds.add(unitId);
        }

        // 각 부대에 대해 역할 재계산
        for (const unitId of unitIds) {
          await assignmentRepository.recalculateRolesForUnit(unitId);
        }
      }
    }

    return result;
  }
}

export default new AssignmentService();

// CommonJS 호환
module.exports = new AssignmentService();
