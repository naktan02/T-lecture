// server/src/domains/instructor/instructor.service.ts
import instructorRepository from './instructor.repository';
import AppError from '../../common/errors/AppError';
import { PROMOTION_CRITERIA } from '../../common/constants/constants';

class InstructorService {
  // 근무 가능일 조회
  async getAvailabilities(instructorId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const availabilities = await instructorRepository.findAvailabilities(
      instructorId,
      startDate,
      endDate,
    );
    return availabilities.map((item) => item.availableOn.toISOString().split('T')[0]);
  }

  // 근무 가능일 수정
  async updateAvailabilities(
    instructorId: number,
    year: number,
    month: number,
    newDatesStr: string[],
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 해당 기간에 이미 배정된(Active) 날짜 조회
    const activeAssignmentDates = await instructorRepository.findActiveAssignmentsDate(
      instructorId,
      startDate,
      endDate,
    );

    // 유효성 검사: 배정된 날짜가 newDatesStr에 모두 포함되어 있는지 확인
    const assignedDatesSet = new Set(
      activeAssignmentDates
        .filter((d): d is Date => d !== null)
        .map((d) => d.toISOString().split('T')[0]),
    );
    const newDatesSet = new Set(newDatesStr);

    for (const assignedDate of assignedDatesSet) {
      if (!newDatesSet.has(assignedDate)) {
        throw new AppError(
          `이미 배정이 확정된 날짜(${assignedDate})는 근무 가능일에서 제외할 수 없습니다.`,
          409,
          'AVAILABILITY_CONFLICT',
          { assignedDate },
        );
      }
    }

    // 업데이트 수행
    await instructorRepository.replaceAvailabilities(instructorId, startDate, endDate, newDatesStr);

    return { message: '근무 가능일이 저장되었습니다.' };
  }

  // 통계 조회
  async getInstructorStats(instructorId: number) {
    const [assignmentCount, rawAssignments, legacyStats] = await Promise.all([
      instructorRepository.countActiveAssignments(instructorId),
      instructorRepository.findAssignmentsForCalc(instructorId),
      instructorRepository.findLegacyStats(instructorId),
    ]);

    let totalMilliseconds = 0;

    rawAssignments.forEach((a) => {
      const unit = a.UnitSchedule?.unit;
      if (unit?.workStartTime && unit?.workEndTime) {
        totalMilliseconds +=
          new Date(unit.workEndTime).getTime() - new Date(unit.workStartTime).getTime();
      }
    });

    const lectureHours = Math.floor(totalMilliseconds / (1000 * 60 * 60));

    return {
      instructorId,
      assignmentCount,
      lectureHours,
      legacyPracticumCount: legacyStats?.legacyPracticumCount || 0,
      autoPromotionEnabled: legacyStats?.autoPromotionEnabled ?? true,
    };
  }

  // 강의 가능 과목(덕목) 수정
  async updateVirtues(instructorId: number, virtueIds: number[]) {
    await instructorRepository.updateVirtues(instructorId, virtueIds);
    return { message: '강의 가능 과목이 수정되었습니다.' };
  }

  // 승급 신청
  async requestPromotion(instructorId: number, desiredLevel: string) {
    const stats = await this.getInstructorStats(instructorId);

    const MIN_HOURS_FOR_PROMOTION = PROMOTION_CRITERIA.MIN_LECTURE_HOURS;

    if (stats.lectureHours < MIN_HOURS_FOR_PROMOTION) {
      throw new AppError(
        `승급 신청 자격이 부족합니다. (현재: ${stats.lectureHours}시간 / 필요: ${MIN_HOURS_FOR_PROMOTION}시간)`,
        400,
        'NOT_ELIGIBLE',
      );
    }

    return {
      message: '승급 신청이 성공적으로 접수되었습니다.',
      currentLevel: 'Assistant',
      requestedLevel: desiredLevel,
      qualificationMet: true,
      evaluatedAt: new Date(),
    };
  }
}

export default new InstructorService();

// CommonJS 호환 (JS 파일에서 require() 사용 시)
module.exports = new InstructorService();
