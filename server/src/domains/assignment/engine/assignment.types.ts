// server/src/domains/assignment/engine/assignment.types.ts
// 배정 알고리즘 엔진용 타입 정의

import { AssignmentState, AssignmentCategory } from '@prisma/client';

// =========================================
// Context (알고리즘 실행 컨텍스트)
// =========================================

export interface AssignmentContext {
  targetMonth: string; // 'YYYY-MM'
  currentScheduleId: number;
  currentScheduleDate: string; // 'YYYY-MM-DD'
  currentUnitId: number;
  currentUnitRegion: string;
  currentAssignments: AssignmentData[]; // 현재까지의 배정
  instructorDistances: Map<string, number>; // `${instructorId}-${unitId}` → km
  config: AssignmentConfig;

  // 계산된 통계
  maxMonthlyAvailCount: number;
  avgAssignmentCount: number;
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
  date: string;
  instructorId: number;
  category: 'Main' | 'Co' | 'Assistant' | 'Practicum' | null;
  teamId: number | null;
  state: AssignmentState;
  classification: AssignmentCategory | null;
}

// =========================================
// Unit Data (부대 데이터)
// =========================================

export interface UnitData {
  id: number;
  name: string;
  region: string;
  wideArea: string;
  schedules: ScheduleData[];
  trainingLocations: LocationData[];
}

export interface ScheduleData {
  id: number;
  date: Date;
  requiredCount: number; // 필요 강사 수
}

export interface LocationData {
  id: number;
  name: string;
  instructorsNumbers: number | null;
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
}

export interface EngineResult {
  assignments: AssignmentResult[];
  stats: {
    totalAssigned: number;
    totalUnassigned: number;
    byUnit: Record<number, number>;
  };
}
