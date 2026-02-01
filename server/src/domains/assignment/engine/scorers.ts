// server/src/domains/assignment/engine/scorers.ts
// 배정 알고리즘 Soft 스코어러 모음

import { AssignmentScorer, InstructorCandidate, AssignmentContext } from './assignment.types';
import {
  SCORER_WEIGHTS,
  CONSECUTIVE_SCORING,
  FAIRNESS_SCORING,
  OPPORTUNITY_COST_CONFIG,
} from './config-loader';

/**
 * 월별 가능일 수 계산
 * - candidate.availableDates: 'YYYY-MM-DD'
 * - context.targetMonth: 'YYYY-MM'
 */
function getMonthlyAvailCount(candidate: InstructorCandidate, context: AssignmentContext): number {
  const m = context.targetMonth;
  if (!m) return 0;
  return (candidate.availableDates || []).reduce((acc, d) => (d.startsWith(m) ? acc + 1 : acc), 0);
}

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
    const count = getMonthlyAvailCount(candidate, context);
    const max = context.maxMonthlyAvailCount || 1;
    return (count / max) * 5; // 0~5점
  },
};

/**
 * 형평성 스코어러
 * - 이번 실행 중 배정이 적을수록 높은 점수
 * - 기존 배정 횟수도 고려
 */
export const fairnessScorer: AssignmentScorer = {
  id: 'FAIRNESS',
  name: '형평성 점수',
  description: '배정이 적을수록 높은 점수',
  defaultWeight: 20, // 가중치 증가
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    // 1. 이번 실행 중 배정된 횟수 (현재 context에서)
    const runtimeAssignments = context.currentAssignments.filter(
      (a) => a.instructorId === candidate.userId,
    ).length;

    // 2. 기존 배정 횟수 (DB에서)
    const existingCount = candidate.recentAssignmentCount;

    // 3. 총 배정 횟수
    const totalCount = runtimeAssignments + existingCount;

    // 4. 배정 횟수가 많을수록 점수 감소 (각 배정당 -2점)
    const penalty = totalCount * 2;
    return Math.max(0, 10 - penalty); // 0~10점, 5번 이상이면 0점
  },
};

/**
 * 연속 배정 스코어러 (TrainingPeriod 기준)
 * - 같은 교육기간(TrainingPeriod)에 배정되면 매우 높은 보너스
 * - excludedDates로 중간에 쉬는 날이 있어도 연속 보너스 유지
 *
 * 변경: 날짜 연속성 → TrainingPeriod ID 기준
 */
export const consecutiveDaysScorer: AssignmentScorer = {
  id: 'CONSECUTIVE',
  name: '연속 배정 보너스',
  description: '같은 교육기간에 배정되면 보너스 (2박3일 우선)',
  defaultWeight: 100, // 가중치 대폭 증가 (연속 배정 최우선)
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const { currentAssignments, currentTrainingPeriodId } = context;

    // TrainingPeriodId가 없으면 기존 로직 사용 (하위 호환)
    if (!currentTrainingPeriodId) {
      return calculateLegacyConsecutive(candidate, context);
    }

    // 같은 TrainingPeriod에 이 강사가 이미 배정된 배정들
    const samePeriodAssignments = currentAssignments.filter(
      (a) => a.trainingPeriodId === currentTrainingPeriodId && a.instructorId === candidate.userId,
    );

    if (samePeriodAssignments.length === 0) return 0;

    // TrainingPeriod 내 배정 일수에 따른 보너스
    const daysAssigned = samePeriodAssignments.length + 1; // 현재 배정 포함

    if (daysAssigned >= 3) return 10; // 3일 이상 → 최대 점수
    if (daysAssigned >= 2) return 7; // 2일 → 높은 점수

    return 5; // 1일 배정 있음 → 기본 보너스
  },
};

/**
 * @deprecated 하위 호환용 - 날짜 연속성 기반 계산
 */
function calculateLegacyConsecutive(
  candidate: InstructorCandidate,
  context: AssignmentContext,
): number {
  const { currentAssignments, currentScheduleDate, currentUnitId } = context;

  // 같은 부대에 이 강사가 이미 배정된 배정들
  const sameUnitAssignments = currentAssignments.filter(
    (a) => a.unitId === currentUnitId && a.instructorId === candidate.userId,
  );

  if (sameUnitAssignments.length === 0) return 0;

  // 현재 날짜
  const targetMs = new Date(currentScheduleDate).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // 연속 일수 계산 (이전/이후 모두 체크)
  let consecutiveDays = 1;
  const assignedDatesMs = sameUnitAssignments.map((a) => new Date(a.date).getTime());

  const hasPrevDay = assignedDatesMs.some((d) => targetMs - d === oneDayMs);
  const hasNextDay = assignedDatesMs.some((d) => d - targetMs === oneDayMs);

  if (hasPrevDay) consecutiveDays++;
  if (hasNextDay) consecutiveDays++;

  if (consecutiveDays >= 3) return 10;
  if (consecutiveDays >= 2) return 7;
  if (hasPrevDay || hasNextDay) return 5;

  return 0;
}

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
  defaultWeight: 15,
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
 * 기회비용 스코어러
 * - 남은 희소 슬롯을 많이 커버하는 강사는 지금 배정하면 손해
 * - 범용 자원 아끼기 (희소 자원 먼저 사용)
 */
export const opportunityCostScorer: AssignmentScorer = {
  id: 'OPPORTUNITY_COST',
  name: '기회비용 점수',
  description: '희소 슬롯 많이 커버하는 강사 감점 (범용 자원 아끼기)',
  defaultWeight: -5, // 음수: 희소 자원 아끼기
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    const remainingSlots = context.remainingSlotsByInstructor?.get(candidate.userId) ?? 0;
    const totalRemaining = context.totalRemainingSlots ?? 1;

    // 남은 슬롯이 평균 이상이면 지금 쓰면 손해 → 감점
    const avgRemaining = totalRemaining / (context.remainingSlotsByInstructor?.size || 1);

    if (remainingSlots > avgRemaining * 1.5) {
      // 평균 1.5배 이상 커버 가능 → 큰 감점
      return 3;
    } else if (remainingSlots > avgRemaining) {
      // 평균 이상 → 작은 감점
      return 1.5;
    }
    // 평균 이하 → 감점 없음 (희소 자원)
    return 0;
  },
};

/**
 * 팀 다양성 스코어러 (교육기간 간 팀 분산)
 * - 다른 교육기간(부대)에 한 팀이 너무 많이 배정되면 감점
 * - 같은 교육기간 내에서는 적용 안 함 (teamMatchingScorer가 보너스 부여)
 */
export const teamDiversityScorer: AssignmentScorer = {
  id: 'TEAM_DIVERSITY',
  name: '팀 다양성 점수',
  description: '다른 교육기간에 한 팀이 집중되면 감점 (팀 골고루 배분)',
  defaultWeight: -15, // 음수: 많이 배정된 팀은 감점
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number {
    if (!candidate.teamId) return 0;

    // 현재 교육기간 제외, 다른 교육기간에서 이 팀이 배정된 횟수
    const teamAssignmentsInOtherPeriods = context.currentAssignments.filter(
      (a) =>
        a.teamId === candidate.teamId && a.trainingPeriodId !== context.currentTrainingPeriodId,
    ).length;

    // 전체 배정 중 이 팀 비율 계산
    const totalOtherAssignments = context.currentAssignments.filter(
      (a) => a.trainingPeriodId !== context.currentTrainingPeriodId,
    ).length;

    if (totalOtherAssignments === 0) return 0;

    // 팀 배정 비율이 평균보다 높으면 감점
    // 7개 팀 기준: 평균 14.3% 이상이면 감점
    const ratio = teamAssignmentsInOtherPeriods / totalOtherAssignments;
    const avgRatio = 1 / 7; // 7개 팀 기준

    if (ratio > avgRatio * 2) {
      // 평균의 2배 이상 → 큰 감점
      return 3;
    } else if (ratio > avgRatio * 1.5) {
      // 평균의 1.5배 이상 → 중간 감점
      return 2;
    } else if (ratio > avgRatio) {
      // 평균 이상 → 작은 감점
      return 1;
    }
    return 0;
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
  teamDiversityScorer, // 팀 다양성 추가
  distanceScorer,
  priorityScorer,
  penaltyScorer,
  opportunityCostScorer,
];
