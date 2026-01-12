// server/src/domains/assignment/services/assignment-response.service.ts
// 배정 응답/확정 전용 서비스 (CQRS - Response)

import {
  assignmentQueryRepository,
  assignmentCommandRepository,
  assignmentConfigRepository,
} from '../repositories';
import AppError from '../../../common/errors/AppError';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../engine/config-loader';

class AssignmentResponseService {
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
   * 강사당 교육생 수 조회
   */
  async getTraineesPerInstructor(): Promise<number> {
    return this.getSystemConfigNumber(
      'TRAINEES_PER_INSTRUCTOR',
      DEFAULT_ASSIGNMENT_CONFIG.traineesPerInstructor,
    );
  }

  /**
   * 임시 배정 응답 (수락/거절)
   */
  async respondToAssignment(
    instructorId: number,
    unitScheduleId: number | string,
    response: string,
  ) {
    const assignment = await assignmentQueryRepository.findAssignmentByKey(
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

    await assignmentCommandRepository.updateStatusByKey(
      instructorId,
      Number(unitScheduleId),
      newState,
    );

    // 수락 시: 자동 확정 체크
    if (newState === 'Accepted') {
      await this.checkAndAutoConfirm(Number(unitScheduleId));
    }

    // 거절 시: 패널티 추가
    if (newState === 'Rejected') {
      const penaltyDays = await this.getSystemConfigNumber('REJECTION_PENALTY_DAYS', 15);

      const schedule = await assignmentQueryRepository.getScheduleWithUnit(Number(unitScheduleId));
      const unitName = schedule?.trainingPeriod?.unit?.name || 'unknown';
      const dateStr = schedule?.date
        ? new Date(schedule.date).toISOString().split('T')[0]
        : 'unknown';

      await assignmentConfigRepository.addPenalty(instructorId, penaltyDays, {
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
   * 강사에게 패널티 추가
   */
  private async addPenaltyToInstructor(
    instructorId: number,
    days: number,
    reason?: { unit: string; date: string; type: string },
  ) {
    await assignmentConfigRepository.addPenalty(instructorId, days, reason);
  }

  /**
   * 자동 확정 체크
   */
  async checkAndAutoConfirm(unitScheduleId: number) {
    const unitId = await assignmentQueryRepository.getUnitIdByScheduleId(unitScheduleId);
    if (!unitId) return;

    const unit = await assignmentQueryRepository.getUnitWithAssignments(unitId);
    if (!unit) return;

    const firstPeriod = unit.trainingPeriods[0];
    if (!firstPeriod) return;

    const allSchedules = firstPeriod.schedules;
    const allLocations = firstPeriod.locations;

    const hasAnyAssignment = allSchedules.some((s) => s.assignments.length > 0);
    if (!hasAnyAssignment) return;

    const isStaffLocked = firstPeriod.isStaffLocked ?? false;

    const traineesPerInstructor = await this.getTraineesPerInstructor();
    const totalRequiredPerSchedule = allLocations.reduce((sum, loc) => {
      const actualCount = loc.scheduleLocations?.[0]?.actualCount || 0;
      return sum + (Math.floor(actualCount / Math.max(1, traineesPerInstructor)) || 1);
    }, 0);

    let allSchedulesFilled = true;

    for (const schedule of allSchedules) {
      const acceptedCount = schedule.assignments.filter((a) => a.state === 'Accepted').length;
      const pendingCount = schedule.assignments.filter((a) => a.state === 'Pending').length;

      if (pendingCount > 0) {
        allSchedulesFilled = false;
        break;
      }

      if (!isStaffLocked && acceptedCount < totalRequiredPerSchedule) {
        allSchedulesFilled = false;
        break;
      }
    }

    if (allSchedulesFilled && allSchedules.length > 0) {
      await assignmentCommandRepository.updateClassificationByUnit(unitId, 'Confirmed');
    }
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
    const assignment = await assignmentQueryRepository.findAssignmentByKey(
      targetInstructorId,
      unitScheduleId,
    );

    if (!assignment) {
      throw new AppError('해당 배정을 찾을 수 없습니다.', 404, 'NOT_FOUND');
    }

    // Pending 상태가 아니면 관리자만 취소 가능
    if (assignment.state !== 'Pending' && !['ADMIN', 'SUPER'].includes(userRole)) {
      throw new AppError('권한이 없습니다.', 403, 'FORBIDDEN');
    }

    // 현재 상태가 Accepted 인 경우
    if (assignment.state === 'Accepted') {
      await assignmentCommandRepository.updateStatusByKey(
        targetInstructorId,
        unitScheduleId,
        'Canceled',
      );

      const penaltyDays = await this.getSystemConfigNumber('CANCEL_PENALTY_DAYS', 15);
      const schedule = await assignmentQueryRepository.getScheduleWithUnit(unitScheduleId);
      const unitName = schedule?.trainingPeriod?.unit?.name || 'unknown';
      const dateStr = schedule?.date
        ? new Date(schedule.date).toISOString().split('T')[0]
        : 'unknown';

      await this.addPenaltyToInstructor(targetInstructorId, penaltyDays, {
        unit: unitName,
        date: dateStr,
        type: '취소',
      });

      // 확정 상태면 해당 스케줄의 다른 배정들도 임시로 복귀
      await assignmentCommandRepository.updateClassificationBySchedule(unitScheduleId, 'Temporary');
    } else {
      // Pending or Rejected → 상태를 Canceled로 변경
      await assignmentCommandRepository.updateStatusByKey(
        targetInstructorId,
        unitScheduleId,
        'Canceled',
      );
    }

    return { message: '배정이 취소되었습니다.' };
  }
}

export const assignmentResponseService = new AssignmentResponseService();
export default assignmentResponseService;
