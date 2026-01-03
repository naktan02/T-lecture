// server/src/domains/assignment/engine/config-loader.ts
// 배정 알고리즘 설정 (개발자 관리용 - 코드에서 직접 수정)

/**
 * 스코어러 가중치
 * - 양수: 선호도 증가
 * - 음수: 페널티
 *
 * 튜닝 가이드:
 * - 연속 배정(100)이 가장 높아야 2박3일 동일 강사 배정 보장
 * - 형평성(20)은 신청횟수(10)보다 높아야 공정한 분배
 * - 페널티(-10)는 거절이력 있는 강사 감점
 */
export const SCORER_WEIGHTS = {
  CONSECUTIVE_DAYS: 100, // 연속 배정 (최우선 - 2박3일 보장)
  PRIORITY: 25, // 우선배정 크레딧
  FAIRNESS: 20, // 형평성
  APPLICATION: 10, // 신청 횟수
  TEAM_MATCHING: 8, // 팀 매칭
  DISTANCE: 5, // 거리 (낮을수록 좋음)
  PENALTY: -10, // 거절 패널티
  OPPORTUNITY_COST: -5, // 기회비용 (희소 자원 아끼기)
};

/**
 * 필터 설정
 */
export const FILTER_CONFIG = {
  internMaxDistanceKm: 50, // 실습강사 최대 거리 (km)
};

/**
 * 후처리 설정
 */
export const POST_PROCESSOR_CONFIG = {
  maxIterations: 200, // Replace/Swap 최대 반복 횟수
  maxScoreLoss: 10, // 최대 점수 손실 허용
};

/**
 * 연속 배정 점수 설정
 */
export const CONSECUTIVE_SCORING = {
  twoDaysScore: 5, // 2일 연속 점수
  threePlusDaysScore: 10, // 3일 이상 연속 점수
};

/**
 * 형평성 점수 설정
 */
export const FAIRNESS_SCORING = {
  penaltyPerAssignment: 2, // 배정당 감점
  maxScore: 10, // 최대 점수
};

/**
 * 기회비용 설정
 */
export const OPPORTUNITY_COST_CONFIG = {
  highThresholdMultiplier: 1.5, // 평균 대비 배수 (1.5배 이상이면 큰 감점)
  highPenaltyScore: 3, // 큰 감점 점수
  lowPenaltyScore: 1.5, // 작은 감점 점수
};

/**
 * 기본 배정 설정
 */
export const DEFAULT_ASSIGNMENT_CONFIG = {
  traineesPerInstructor: 36, // 강사당 교육생 수
  rejectionPenaltyMonths: 2, // 거절 패널티 적용 기간 (개월)
  fairnessLookbackMonths: 3, // 공정성 계산 기간 (개월)
};

/**
 * 팀 주간 균형 설정
 */
export const TEAM_BALANCE_CONFIG = {
  maxWeeklyAssignmentsPerTeam: 5, // 팀당 주간 최대 배정 수
  balancePenalty: 20, // 초과 시 감점
};
