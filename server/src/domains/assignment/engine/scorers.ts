// server/src/domains/assignment/engine/scorers.ts
// 배정 알고리즘 Soft 스코어러 모음

import { AssignmentScorer, InstructorCandidate, AssignmentContext } from './assignment.types';

/**
 * 신청 횟수 스코어러
 * - 해당 월 가능일 등록 수가 많을수록 높은 점수
 */
export const applicationCountScorer: AssignmentScorer = {
  id: 'APPLICATION',
  name: '신청 횟수 점수',
  description: '해당 월 가능일 등록 수가 많을수록 높은 점수',
  defaultWeight: 10,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const count = candidate.monthlyAvailabilityCount;
    const max = context.maxMonthlyAvailCount || 1;
    return (count / max) * 5; // 0~5점
  },
};

/**
 * 형평성 스코어러
 * - 최근 배정이 적을수록 높은 점수
 */
export const fairnessScorer: AssignmentScorer = {
  id: 'FAIRNESS',
  name: '형평성 점수',
  description: '최근 배정이 적을수록 높은 점수',
  defaultWeight: 15,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const count = candidate.recentAssignmentCount;
    const avg = context.avgAssignmentCount || 1;
    if (count >= avg) return 0; // 평균 이상이면 보너스 없음
    return ((avg - count) / avg) * 5; // 부족할수록 높은 점수
  },
};

/**
 * 연속 배정 스코어러
 * - 같은 부대에 연속으로 배정되면 보너스
 */
export const consecutiveDaysScorer: AssignmentScorer = {
  id: 'CONSECUTIVE',
  name: '연속 배정 보너스',
  description: '같은 부대에 연속으로 배정되면 보너스',
  defaultWeight: 20,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const { currentAssignments, currentScheduleDate, currentUnitId } = context;

    // 같은 부대에 이미 배정된 날짜 확인
    const sameUnitAssignments = currentAssignments.filter(
      (a) => a.unitId === currentUnitId && a.instructorId === candidate.userId,
    );

    if (sameUnitAssignments.length === 0) return 0;

    // 연속 여부 체크 (하루 차이)
    const targetMs = new Date(currentScheduleDate).getTime();
    const isConsecutive = sameUnitAssignments.some((a) => {
      const diff = Math.abs(new Date(a.date).getTime() - targetMs);
      return diff === 24 * 60 * 60 * 1000; // 1일
    });

    return isConsecutive ? 5 : 0;
  },
};

/**
 * 팀 매칭 스코어러
 * - 같은 팀원과 함께 배정 시 보너스
 */
export const teamMatchingScorer: AssignmentScorer = {
  id: 'TEAM',
  name: '팀 매칭 보너스',
  description: '같은 팀원과 함께 배정 시 보너스',
  defaultWeight: 8,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    if (!candidate.teamId) return 0;

    const sameTeamAssigned = context.currentAssignments.some(
      (a) => a.scheduleId === context.currentScheduleId && a.teamId === candidate.teamId,
    );
    return sameTeamAssigned ? 3 : 0;
  },
};

/**
 * 거리 스코어러
 * - 가까울수록 높은 점수
 */
export const distanceScorer: AssignmentScorer = {
  id: 'DISTANCE',
  name: '거리 점수',
  description: '가까울수록 높은 점수',
  defaultWeight: 5,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const key = `${candidate.userId}-${context.currentUnitId}`;
    const distance = context.instructorDistances.get(key) ?? 100;
    // 가까울수록 높은 점수 (100km 기준)
    return Math.max(0, (100 - distance) / 20); // 0~5점
  },
};

/**
 * 우선배정 스코어러
 * - 우선배정 크레딧이 있으면 높은 점수
 */
export const priorityScorer: AssignmentScorer = {
  id: 'PRIORITY',
  name: '우선배정 크레딧',
  description: '우선배정 크레딧이 있으면 높은 점수',
  defaultWeight: 25,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    return Math.min(candidate.priorityCredits, 3) * 1.5; // 최대 4.5점
  },
};

/**
 * 패널티 스코어러
 * - 최근 거절 횟수만큼 감점
 */
export const penaltyScorer: AssignmentScorer = {
  id: 'PENALTY',
  name: '거절 패널티',
  description: '최근 거절 횟수만큼 감점',
  defaultWeight: -10,
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    return candidate.recentRejectionCount; // 거절 횟수만큼 감점 (weight가 음수이므로)
  },
};

/**
 * 모든 스코어러 목록
 */
export const allScorers: AssignmentScorer[] = [
  applicationCountScorer,
  fairnessScorer,
  consecutiveDaysScorer,
  teamMatchingScorer,
  distanceScorer,
  priorityScorer,
  penaltyScorer,
];
