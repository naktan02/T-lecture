// web/server/src/domains/instructor/services/instructor.service.js
const instructorRepository = require('./instructor.repository');
const AppError = require('../../common/errors/AppError');
const { PROMOTION_CRITERIA } = require('../../common/constants/constants');

// [제거됨] getMyProfile -> User 도메인에서 담당

class InstructorService {
  
  /**
   * [기존 유지 + 클래스 메서드화] 근무 가능일 조회
   */
  async getAvailabilities(instructorId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const availabilities = await instructorRepository.findAvailabilities(instructorId, startDate, endDate);
    return availabilities.map(item => item.availableOn.toISOString().split('T')[0]);
  }

  /**
   * [기존 유지 + 클래스 메서드화] 근무 가능일 수정
   * - 변경점: 유효성 검사를 위해 Repository에 새로 추가한 findActiveAssignmentsDate를 사용합니다.
   */
  async updateAvailabilities(instructorId, year, month, newDatesStr) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 1. 해당 기간에 이미 배정된(Active) 날짜 조회
    const activeAssignmentDates = await instructorRepository.findActiveAssignmentsDate(instructorId, startDate, endDate);

    // 2. 유효성 검사: 배정된 날짜가 newDatesStr에 모두 포함되어 있는지 확인
    const assignedDatesSet = new Set(activeAssignmentDates.map(d => d.toISOString().split('T')[0]));
    const newDatesSet = new Set(newDatesStr);

    for (const assignedDate of assignedDatesSet) {
      if (!newDatesSet.has(assignedDate)) {
        throw new Error(`이미 배정이 확정된 날짜(${assignedDate})는 근무 가능일에서 제외할 수 없습니다.`);
      }
    }

    // 3. 업데이트 수행
    await instructorRepository.replaceAvailabilities(instructorId, startDate, endDate, newDatesStr);
    
    return { message: '근무 가능일이 저장되었습니다.' };
  }

  /**
   * 3. [신규] 통계 조회
   * - Service에서 Repository를 여러 번 호출하여 데이터를 모으고 직접 계산합니다.
   */
  async getInstructorStats(instructorId) {
    // 1. 병렬로 DB 데이터 가져오기 (성능 최적화)
    const [assignmentCount, rawAssignments, legacyStats] = await Promise.all([
      instructorRepository.countActiveAssignments(instructorId),
      instructorRepository.findAssignmentsForCalc(instructorId),
      instructorRepository.findLegacyStats(instructorId)
    ]);

    // 2. [비즈니스 로직] 총 강의 시간 계산 (JS 연산)
    let totalMilliseconds = 0;
    
    rawAssignments.forEach(a => {
      const unit = a.UnitSchedule?.unit;
      if (unit?.workStartTime && unit?.workEndTime) {
        // 종료시간 - 시작시간
        totalMilliseconds += (new Date(unit.workEndTime) - new Date(unit.workStartTime));
      }
    });

    // ms -> 시간(hour) 단위로 변환 (소수점 버림)
    const lectureHours = Math.floor(totalMilliseconds / (1000 * 60 * 60));

    // 3. 결과 반환
    return {
      instructorId,
      assignmentCount, 
      lectureHours,    
      legacyPracticumCount: legacyStats?.legacyPracticumCount || 0,
      autoPromotionEnabled: legacyStats?.autoPromotionEnabled ?? true
    };
  }

  /**
   * [신규] 강의 가능 과목(덕목) 수정
   * - 트랜잭션 처리는 Repository에 위임합니다.
   */
  async updateVirtues(instructorId, virtueIds) {
    await instructorRepository.updateVirtues(instructorId, virtueIds);
    return { message: '강의 가능 과목이 수정되었습니다.' };
  }

  /**
   * 5. [변경] 승급 신청 (Promotion Request)
   * - 단순 조회가 아니라, 강사의 실적(강의 시간)을 검증하여 승급 자격을 판단하는 비즈니스 로직입니다.
   */
  async requestPromotion(instructorId, desiredLevel) {
    // 1. 현재 강사 정보 및 통계 조회
    const stats = await this.getInstructorStats(instructorId);
    
    // 2. [비즈니스 로직] 승급 자격 요건 검증 (예: 강의 시간 50시간 이상)
    const MIN_HOURS_FOR_PROMOTION = PROMOTION_CRITERIA.MIN_LECTURE_HOURS;
    
    if (stats.lectureHours < MIN_HOURS_FOR_PROMOTION) {
        throw new AppError(
            `승급 신청 자격이 부족합니다. (현재: ${stats.lectureHours}시간 / 필요: ${MIN_HOURS_FOR_PROMOTION}시간)`,
            400,
            'NOT_ELIGIBLE'
        );
    }

    return {
        message: '승급 신청이 성공적으로 접수되었습니다.',
        currentLevel: 'Assistant', // 예시
        requestedLevel: desiredLevel,
        qualificationMet: true,
        evaluatedAt: new Date()
    };
  }
}

module.exports = new InstructorService();
