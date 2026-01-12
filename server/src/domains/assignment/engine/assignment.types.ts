// server/src/domains/assignment/engine/assignment.types.ts
// 배정 알고리즘 엔진용 타입 정의

import { AssignmentState, AssignmentCategory } from '../../../generated/prisma/client.js';

// =========================================
// Context (알고리즘 실행 컨텍스트)
// =========================================

export interface AssignmentContext {
  targetMonth: string; // 'YYYY-MM'
  currentScheduleId: number;
  currentScheduleDate: string; // 'YYYY-MM-DD'
  currentUnitId: number;
  currentTrainingPeriodId: number; // TrainingPeriod ID (연속 판단용)
  currentUnitRegion: string;
  currentAssignments: AssignmentData[]; // 현재까지의 배정
  instructorDistances: Map<string, number>; // `${instructorId}-${unitId}` → km
  config: AssignmentConfig;

  // 계산된 통계
  maxMonthlyAvailCount: number;
  avgAssignmentCount: number;
  blockedInstructorIdsBySchedule?: Map<number, Set<number>>;

  // 기회비용 계산용 (Slack 기반)
  remainingSlotsByInstructor?: Map<number, number>; // instructorId → 남은 배정 가능 슬롯 수
  totalRemainingSlots?: number; // 전체 남은 슬롯 수
}

export interface AssignmentConfig {
  traineesPerInstructor: number; // 36명당 1강사
  rejectionPenaltyMonths: number; // 최근 N개월 거절 횟수
  fairnessLookbackMonths: number; // 형평성 계산 기간
  scorerWeights: Record<string, number>; // 스코어러별 가중치
}

// =========================================
// Instructor Candidate (강사 후보)
// =========================================

export interface InstructorCandidate {
  userId: number;
  name: string;
  category: 'Main' | 'Co' | 'Assistant' | 'Practicum' | null;
  teamId: number | null;
  teamName: string | null;
  isTeamLeader: boolean;
  generation: number | null;
  restrictedArea: string | null;
  maxDistanceKm: number | null;
  location: string | null;
  availableDates: string[]; // 'YYYY-MM-DD' 배열
  priorityCredits: number; // 우선배정 크레딧
  recentRejectionCount: number; // 최근 거절 횟수
  recentAssignmentCount: number; // 최근 배정 횟수
  monthlyAvailabilityCount: number; // 해당 월 가능일 수
}

// =========================================
// Assignment Data (배정 데이터)
// =========================================

export interface AssignmentData {
  unitScheduleId: number;
  scheduleId: number;
  unitId: number;
  trainingPeriodId: number; // TrainingPeriod ID (연속 판단용)
  date: string;
  instructorId: number;
  category: 'Main' | 'Co' | 'Assistant' | 'Practicum' | null;
  teamId: number | null;
  state: AssignmentState;
  classification: AssignmentCategory | null;
  // 역할 결정용
  isTeamLeader?: boolean;
  generation?: number | null;
}

// =========================================
// Unit Data (부대 데이터)
// =========================================

/**
 * 교육기간(TrainingPeriod) 단위 데이터
 * - 배정의 기본 단위 (같은 TrainingPeriod = 같은 연속 일정)
 */
export interface TrainingPeriodData {
  id: number;
  unitId: number;
  unitName: string;
  region: string;
  wideArea: string;
  isStaffLocked: boolean; // 인원고정 여부
  excludedDates: string[]; // 교육불가일자 (논리적 연속 판단용)
  schedules: ScheduleData[];
  locations: LocationData[];
}

/**
 * 부대(Unit) 데이터
 * - 하위에 여러 TrainingPeriod를 가짐
 */
export interface UnitData {
  id: number;
  name: string;
  region: string;
  wideArea: string;
  trainingPeriods: TrainingPeriodData[];
}

export interface ScheduleData {
  id: number;
  date: Date;
  requiredCount: number; // 필요 강사 수 (모든 장소 합산)
  isBlocked?: boolean; // 배정막기 상태
}

export interface LocationData {
  id: number;
  name: string;
  requiredCount?: number; // 장소별 필요 인원 (후처리용)
}

// =========================================
// Bundle Types (Slack 기반 배정용)
// =========================================

/**
 * TrainingPeriod 단위 묶음
 * - 같은 TrainingPeriod의 모든 일정을 하나의 묶음으로 관리
 * - excludedDates가 있어도 논리적으로 연속된 일정으로 취급
 */
export interface ScheduleBundle {
  bundleId: string; // `tp_${trainingPeriodId}`
  unitId: number;
  unitName: string;
  region: string;
  trainingPeriodId: number; // TrainingPeriod ID (핵심)
  isStaffLocked: boolean; // 인원고정 여부
  excludedDates: string[]; // 교육불가일자
  schedules: ScheduleData[]; // 해당 기간의 스케줄들
  dates: string[]; // 'YYYY-MM-DD' 배열
  requiredPerDay: number; // 각 날짜별 필요 인원 (평균)
  totalRequired: number; // 전체 필요 인원
  trainingLocations: LocationData[];
}

/**
 * 묶음별 Slack 정보
 * - Slack = 가능 인원 - 필요 인원
 * - 낮을수록 위험 → 먼저 처리
 */
export interface BundleSlackInfo {
  bundle: ScheduleBundle;

  // 전체 연속 가능한 강사 ID 목록
  fullBundleCandidateIds: number[];

  // Slack 계산 (날짜별 min)
  minSlack: number; // min_over_days(available - required)

  // 겹치는 날짜 병목 페널티
  overlapPenalty: number;

  // 최종 위험도 (낮을수록 위험)
  riskScore: number; // minSlack - overlapPenalty
}

// =========================================
// Filter & Scorer Interfaces
// =========================================

export interface AssignmentFilter {
  id: string;
  name: string;
  description: string;
  /**
   * 후보자 필터링 (false 반환 시 제외)
   */
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean;
}

export interface AssignmentScorer {
  id: string;
  name: string;
  description: string;
  defaultWeight: number;
  /**
   * 점수 계산 (0~5 스케일 권장)
   */
  calculate(candidate: InstructorCandidate, context: AssignmentContext): number;
}

export interface PostProcessor {
  id: string;
  name: string;
  /**
   * 배정 완료 후 처리
   */
  process(assignments: AssignmentResult[], context: AssignmentContext): AssignmentResult[];
}

// =========================================
// Result Types
// =========================================

export interface AssignmentResult {
  unitScheduleId: number;
  instructorId: number;
  score: number;
  classification?: AssignmentCategory;
  role?: 'Head' | 'Supervisor' | null;
}

// =========================================
// Debug/Breakdown Types (분석용)
// =========================================

/**
 * 개별 스코어러의 점수 분해
 */
export interface ScoreBreakdown {
  scorerId: string;
  scorerName: string;
  weight: number;
  raw: number; // scorer.calculate 결과
  weighted: number; // weight * raw
}

/**
 * 디버그용 후보자 정보
 */
export interface DebugCandidateInfo {
  userId: number;
  name: string;
  totalScore: number;
  monthlyAvailCount: number;
  recentAssignmentCount: number;
  recentRejectionCount: number;
  priorityCredits: number;
  tieRand: number; // deterministic 0~1
  breakdown: ScoreBreakdown[];
}

/**
 * 디버그용 스케줄 정보
 */
export interface DebugScheduleInfo {
  uniqueScheduleId: number;
  date: string; // YYYY-MM-DD
  required: number;
  candidatesTotal: number;
  candidatesAfterFilter: number;
  topK: number;
  topCandidates: DebugCandidateInfo[];
  selected: Array<{
    userId: number;
    name: string;
    totalScore: number;
  }>;
}

/**
 * 엔진 디버그 결과
 * - 배정 후 분석/감사/튜닝용
 * - debugTopK > 0일 때만 생성됨
 */
export interface EngineDebugResult {
  schedules: DebugScheduleInfo[];
}

// =========================================
// Engine Result
// =========================================

export interface EngineResult {
  assignments: AssignmentResult[];
  stats: {
    totalAssigned: number;
    totalUnassigned: number;
    byUnit: Record<number, number>;
  };
  /**
   * 디버그/감사/튜닝용 (옵션)
   * - debugTopK > 0으로 호출 시에만 포함
   */
  debug?: EngineDebugResult;
}
