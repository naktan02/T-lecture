// server/src/domains/assignment/assignment.service.ts
import assignmentRepository from './assignment.repository';
import instructorRepository from '../instructor/instructor.repository';
import AppError from '../../common/errors/AppError';
import assignmentAlgorithm from './assignment.algorithm';
import assignmentDTO from './assignment.dto';

/**
 * 강사 배정 비즈니스 로직 전담 Service
 */
class AssignmentService {
  private subtractMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() - months);
    return d;
  }

  /**
   * 배정 후보 데이터 조회 (Raw Data 반환)
   */
  async getAssignmentCandidatesRaw(startDate: string, endDate: string) {
    const unitsRaw = await assignmentRepository.findScheduleCandidates(startDate, endDate);
    const instructorsRaw = await instructorRepository.findAvailableInPeriod(startDate, endDate);
    return { unitsRaw, instructorsRaw };
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

    // 1) 데이터 준비
    const units = await assignmentRepository.findScheduleCandidates(start, end);
    const instructors = await instructorRepository.findAvailableInPeriod(
      start.toISOString(),
      end.toISOString(),
    );

    if (!units || units.length === 0) {
      throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
    }
    if (!instructors || instructors.length === 0) {
      throw new AppError('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    const traineesPerInstructor = await assignmentRepository.getSystemConfigNumber(
      'TRAINEES_PER_INSTRUCTOR',
      36,
    );

    const scheduleIds = Array.from(
      new Set(units.flatMap((u) => (u.schedules || []).map((s) => s.id))),
    );
    const blockedInstructorIdsBySchedule =
      await assignmentRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

    // ===== 최근 통계(공정성/패널티) =====
    // 엔진 config에서 사용 중인 값과 맞춰서 우선 하드코딩(추후 SystemConfig로 빼도 됨)
    // NOTE: 운영 중 튜닝 가능한 값들은 SystemConfig에서 가져오고, 없으면 기본값을 사용한다.
    const fairnessLookbackMonths = await assignmentRepository.getSystemConfigNumber(
      'FAIRNESS_LOOKBACK_MONTHS',
      3,
    );
    const rejectionPenaltyMonths = await assignmentRepository.getSystemConfigNumber(
      'REJECTION_PENALTY_MONTHS',
      6,
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

    // DEBUG: 엔진 결과 확인
    console.log(`[DEBUG Engine] matchResults count: ${matchResults?.length ?? 0}`);
    if (matchResults && matchResults.length > 0) {
      console.log(`[DEBUG Engine] First 5 results:`, matchResults.slice(0, 5));
    }

    if (!matchResults || matchResults.length === 0) {
      throw new AppError('배정 가능한 매칭 결과가 없습니다.', 404, 'NO_MATCHES');
    }

    const summary = await assignmentRepository.createAssignmentsBulk(matchResults);
    const updatedUnits = await assignmentRepository.findScheduleCandidates(start, end);
    return {
      summary,
      data: assignmentDTO.toHierarchicalResponse(updatedUnits),
    };
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
    const instructors = await instructorRepository.findAvailableInPeriod(
      start.toISOString(),
      end.toISOString(),
    );

    if (!units || units.length === 0) {
      throw new AppError('해당 기간에 조회되는 부대 일정이 없습니다.', 404, 'NO_UNITS');
    }
    if (!instructors || instructors.length === 0) {
      throw new AppError('해당 기간에 배정 가능한 강사가 없습니다.', 404, 'NO_INSTRUCTORS');
    }

    const traineesPerInstructor = await assignmentRepository.getSystemConfigNumber(
      'TRAINEES_PER_INSTRUCTOR',
      36,
    );
    const scheduleIds = Array.from(
      new Set(units.flatMap((u) => (u.schedules || []).map((s) => s.id))),
    );
    const blockedInstructorIdsBySchedule =
      await assignmentRepository.findCanceledInstructorIdsByScheduleIds(scheduleIds);

    const fairnessLookbackMonths = await assignmentRepository.getSystemConfigNumber(
      'FAIRNESS_LOOKBACK_MONTHS',
      3,
    );
    const rejectionPenaltyMonths = await assignmentRepository.getSystemConfigNumber(
      'REJECTION_PENALTY_MONTHS',
      6,
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

    return {
      message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
    };
  }

  /**
   * 관리자 배정 취소
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

    return await assignmentRepository.updateStatusByKey(
      targetInstructorId,
      unitScheduleId,
      'Canceled',
    );
  }

  /**
   * 근무 이력 조회 (Confirmed + Past)
   */
  async getWorkHistory(instructorId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await assignmentRepository.findAllByInstructorId(instructorId, {
      state: 'Accepted',
      UnitSchedule: { date: { lt: today } },
    });
  }

  /**
   * 배정 목록 조회 (Active + Future)
   */
  async getUpcomingAssignments(instructorId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await assignmentRepository.findAllByInstructorId(instructorId, {
      state: { in: ['Pending', 'Accepted'] },
      UnitSchedule: { date: { gte: today } },
    });
  }

  /**
   * 스케줄 슬롯 배정 막기/해제
   */
  async toggleScheduleBlock(unitScheduleId: number, isBlocked: boolean) {
    return await assignmentRepository.updateScheduleBlock(unitScheduleId, isBlocked);
  }
}

export default new AssignmentService();

// CommonJS 호환
module.exports = new AssignmentService();
