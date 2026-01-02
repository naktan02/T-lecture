// server/src/domains/assignment/assignment.service.ts
import assignmentRepository from './assignment.repository';
import instructorRepository from '../instructor/instructor.repository';
import AppError from '../../common/errors/AppError';
import assignmentAlgorithm from './assignment.algorithm';
import assignmentDTO from './assignment.dto';
import { DEFAULT_ASSIGNMENT_CONFIG } from './engine/config-loader';
import prisma from '../../libs/prisma';

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
   * 날짜에서 월 빼기 유틸
   */
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

    const traineesPerInstructor = await this.getSystemConfigNumber('TRAINEES_PER_INSTRUCTOR', 36);

    const scheduleIds = Array.from(
      new Set(units.flatMap((u) => (u.schedules || []).map((s) => s.id))),
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

    const traineesPerInstructor = await this.getSystemConfigNumber('TRAINEES_PER_INSTRUCTOR', 36);
    const scheduleIds = Array.from(
      new Set(units.flatMap((u) => (u.schedules || []).map((s) => s.id))),
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

    return {
      message: response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.',
    };
  }

  /**
   * 부대(Unit) 전체의 필요 인원이 모두 수락되었는지 확인하고 자동 확정
   * - 각 장소별 필요 인원 × 각 스케줄에서 수락된 인원 체크
   * - isBlocked=true인 스케줄은 필요인원 충족으로 간주
   * - 모든 슬롯이 채워지면 부대 전체 확정
   */
  private async checkAndAutoConfirm(unitScheduleId: number) {
    // 1. 스케줄에서 부대 ID 조회
    const unitId = await assignmentRepository.getUnitIdByScheduleId(unitScheduleId);
    if (!unitId) return;

    // 2. 부대의 모든 정보 조회
    const unit = await assignmentRepository.getUnitWithAssignments(unitId);
    if (!unit) return;

    // 3. 장소별 필요 인원 합계
    const totalRequiredPerSchedule = unit.trainingLocations.reduce(
      (sum, loc) => sum + (loc.instructorsNumbers || 0),
      0,
    );

    if (totalRequiredPerSchedule === 0) return; // 필요 인원이 0이면 확정 불필요

    // 4. 모든 스케줄에서 수락된 인원 체크 (블록된 스케줄은 충족으로 간주)
    let allSchedulesFilled = true;

    for (const schedule of unit.schedules) {
      // isBlocked=true면 해당 일정은 필요인원 충족으로 간주
      if ((schedule as any).isBlocked) {
        continue;
      }

      const acceptedCount = schedule.assignments.filter((a) => a.state === 'Accepted').length;

      if (acceptedCount < totalRequiredPerSchedule) {
        allSchedulesFilled = false;
        break;
      }
    }

    // 5. 모든 스케줄이 필요 인원을 채웠으면 부대 전체 확정
    if (allSchedulesFilled && unit.schedules.length > 0) {
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

    // 확정에서 인원이 삭제되면 해당 스케줄의 배정들을 임시로 복귀
    if (wasConfirmed) {
      await assignmentRepository.updateClassificationBySchedule(unitScheduleId, 'Temporary');
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

  /**
   * 부대의 모든 스케줄 일괄 배정막기
   */
  async bulkBlockUnit(unitId: number, isBlocked: boolean) {
    return await assignmentRepository.bulkBlockByUnitId(unitId, isBlocked);
  }

  /**
   * 내 배정 목록 조회 (강사용 - 메시지함에서 사용)
   */
  async getMyAssignments(userId: number) {
    return await assignmentRepository.getMyAssignments(userId);
  }
}

export default new AssignmentService();

// CommonJS 호환
module.exports = new AssignmentService();
