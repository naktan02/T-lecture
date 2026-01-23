// server/src/domains/assignment/services/assignment-query.service.ts
// 배정 조회 전용 서비스 (CQRS - Query)

import { assignmentQueryRepository, assignmentConfigRepository } from '../repositories';
import instructorRepository from '../../instructor/instructor.repository';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../engine/config-loader';
import type { UnitRaw, InstructorRaw } from '../../../types/assignment.types';

// Helper: 오늘 UTC 자정 생성
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

class AssignmentQueryService {
  /**
   * 시스템 설정 숫자 값 조회
   */
  async getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
    const value = await assignmentConfigRepository.getSystemConfigValue(key);
    if (!value) return defaultValue;
    const parsed = Number(value);
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
   * 배정 후보 데이터 조회 (DB 직접 조회 - 간소화)
   */
  async getAssignmentCandidatesWithCache(startDate: string, endDate: string, _userId: number) {
    // 1) DB에서 부대 + 배정 데이터 한 번에 조회
    const unitsRaw = await assignmentQueryRepository.findScheduleCandidates(startDate, endDate);

    // 정렬은 클라이언트에서 수행 (grouping 후 순서 보장)

    // 3) 스케줄 날짜 범위 계산
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
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

    const actualDateRangeStr = {
      startDate: minScheduleDate.toISOString().split('T')[0],
      endDate: maxScheduleDate.toISOString().split('T')[0],
    };

    // 4) 강사 목록 조회 (기간 내 가능한 강사)
    const instructorsRaw = await instructorRepository.findAvailableInPeriod(
      actualDateRangeStr.startDate,
      actualDateRangeStr.endDate,
    );

    // 5) 전체 승인된 강사 목록 조회 (전체 검색용)
    const allInstructorsRaw = await instructorRepository.findActiveInstructors();

    return {
      unitsRaw: unitsRaw as unknown as UnitRaw[],
      instructorsRaw: instructorsRaw as unknown as InstructorRaw[],
      allInstructorsRaw: allInstructorsRaw as unknown as InstructorRaw[],
      actualDateRange: actualDateRangeStr,
    };
  }

  /**
   * 근무 이력 조회 (Confirmed + Past)
   */
  async getWorkHistory(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentQueryRepository.findAllByInstructorId(instructorId, {
      state: 'Accepted',
      UnitSchedule: { date: { lt: today } },
    });
  }

  /**
   * 배정 목록 조회 (Active + Future)
   */
  async getUpcomingAssignments(instructorId: number) {
    const today = getTodayUTC();
    return await assignmentQueryRepository.findAllByInstructorId(instructorId, {
      state: { in: ['Pending', 'Accepted'] },
      UnitSchedule: { date: { gte: today } },
    });
  }

  /**
   * 내 배정 목록 조회 (강사용 - 메시지함에서 사용)
   */
  async getMyAssignments(userId: number) {
    return await assignmentQueryRepository.getMyAssignments(userId);
  }
}

export const assignmentQueryService = new AssignmentQueryService();
export default assignmentQueryService;
