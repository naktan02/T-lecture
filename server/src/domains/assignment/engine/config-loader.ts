// server/src/domains/assignment/engine/config-loader.ts
// 배정 알고리즘 설정 (중앙 집중 관리)

/**
 * =========================================
 * 스코어러 가중치 (배정 알고리즘 튜닝 핵심)
 * =========================================
 *
 * - 양수: 선호도 증가 (높을수록 우선 배정)
 * - 음수: 페널티 (점수 감점)
 *
 * 📌 튜닝 가이드:
 * - CONSECUTIVE(100) + FULL_PERIOD(80): 2박3일 동일 강사 배정 보장
 * - FAIRNESS(20): 공정한 분배
 * - PENALTY(-10): 거절 이력 있는 강사 감점
 *
 * 📊 점수 계산: 가중치 × raw점수(0~10) = 최종 점수
 * 예) CONSECUTIVE(100) × 10점 = 1000점
 */
export const SCORER_WEIGHTS = {
  // === 연속성 관련 (최우선) ===
  CONSECUTIVE: 100, // 연속 배정 보너스 (같은 교육기간 내 배정 시)
  FULL_PERIOD: 80, // 전일 커버 보너스 (교육기간 전체 가용 시, 첫날부터 적용)

  // === 우선순위 관련 ===
  PRIORITY: 25, // 우선배정 크레딧 보유자 우선
  FAIRNESS: 20, // 형평성 (배정 적은 사람 우선)
  DISTANCE: 15, // 거리 점수 (가까울수록 우선)
  APPLICATION: 10, // 신청 횟수 (가용일 많이 등록한 사람 우선)
  TEAM: 8, // 팀 매칭 보너스 (같은 팀원과 배정 시)

  // === 페널티 (음수) ===
  TEAM_DIVERSITY: -15, // 팀 다양성 (한 팀 집중 방지)
  PENALTY: -10, // 거절 패널티 (최근 거절 이력)
  OPPORTUNITY_COST: -5, // 기회비용 (희소 자원 아끼기)
};

/**
 * 후처리 설정
 */
export const POST_PROCESSOR_CONFIG = {
  maxIterations: 200, // Replace/Swap 최대 반복 횟수
  maxScoreLoss: 10, // 최대 점수 손실 허용
};

/**
 * 기본 배정 설정
 */
export const DEFAULT_ASSIGNMENT_CONFIG = {
  traineesPerInstructor: 36, // 강사당 교육생 수
  rejectionPenaltyMonths: 2, // 거절 패널티 적용 기간 (개월)
  fairnessLookbackMonths: 3, // 공정성 계산 기간 (개월)
};
