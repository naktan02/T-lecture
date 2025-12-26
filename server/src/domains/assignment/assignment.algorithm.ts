// server/src/domains/assignment/assignment.algorithm.ts
// 배정 알고리즘 - 엔진 어댑터
// 기존 service와의 호환성을 유지하면서 새 engine을 사용

import { AssignmentEngine, InstructorCandidate, UnitData, ScheduleData } from './engine';

// =========================================
// 입력 타입 (기존 형태 유지)
// =========================================

interface TrainingLocation {
  id?: number;
  instructorsNumbers?: number | null;
  originalPlace?: string | null;
}

interface Assignment {
  userId: number;
  trainingLocationId?: number | null;
  state: string;
}

interface Schedule {
  id: number;
  date: Date;
  assignments?: Assignment[];
}

interface UnitWithSchedules {
  id: number;
  name?: string | null;
  region?: string | null;
  wideArea?: string | null;
  trainingLocations: TrainingLocation[];
  schedules: Schedule[];
}

interface Availability {
  availableOn: Date;
}

interface InstructorWithData {
  userId: number;
  category?: 'Main' | 'Co' | 'Assistant' | 'Practicum' | null;
  teamId?: number | null;
  team?: { id?: number; name?: string | null } | null;
  isTeamLeader?: boolean;
  generation?: number | null;
  restrictedArea?: string | null;
  location?: string | null;
  availabilities: Availability[];
  priorityCredit?: { credits: number } | null;
  User?: { name?: string | null };
}

interface AssignmentResult {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId: number | null;
  role: string;
}

// =========================================
// 날짜 유틸
// =========================================

function toDateString(date: Date): string {
  // UTC 기준 날짜 문자열로 변환 (DB 저장 형식과 일치)
  return date.toISOString().split('T')[0];
}

// =========================================
// 알고리즘 클래스
// =========================================

class AssignmentAlgorithm {
  private engine: AssignmentEngine;

  constructor() {
    this.engine = new AssignmentEngine({
      traineesPerInstructor: 36,
      rejectionPenaltyMonths: 6,
      fairnessLookbackMonths: 3,
    });
  }

  /**
   * 자동 배정 알고리즘 실행
   */
  execute(rawUnits: UnitWithSchedules[], rawInstructors: InstructorWithData[]): AssignmentResult[] {
    // 1. 데이터 변환
    const units = this.transformUnits(rawUnits);
    const candidates = this.transformInstructors(rawInstructors);

    if (units.length === 0 || candidates.length === 0) {
      return [];
    }

    // 2. 엔진 실행
    const result = this.engine.execute(units, candidates);

    // 3. 결과 변환 (기존 형식으로)
    // uniqueScheduleId = (원본scheduleId * 1000) + locationIndex
    return result.assignments.map((a) => {
      const originalScheduleId = Math.floor(a.unitScheduleId / 1000);
      const locationIndex = a.unitScheduleId % 1000;
      // locationIndex → trainingLocationId 매핑은 rawUnits에서 추출해야 함
      // 일단 유닛 찾아서 해당 장소 ID 가져오기
      const unit = rawUnits.find((u) => u.schedules.some((s) => s.id === originalScheduleId));
      const trainingLocationId = unit?.trainingLocations[locationIndex]?.id ?? null;

      return {
        unitScheduleId: originalScheduleId,
        instructorId: a.instructorId,
        trainingLocationId,
        role: 'Main', // 일단 모두 Main
      };
    });
  }

  /**
   * 부대 데이터 변환
   * - 장소별로 스케줄 분리하여 배정
   * - uniqueScheduleId = (원본scheduleId * 1000) + locationIndex
   */
  private transformUnits(rawUnits: UnitWithSchedules[]): UnitData[] {
    return rawUnits.map((unit) => {
      // 장소별로 스케줄 분리
      const schedules: ScheduleData[] = [];

      for (const schedule of unit.schedules) {
        for (let locIdx = 0; locIdx < unit.trainingLocations.length; locIdx++) {
          const loc = unit.trainingLocations[locIdx];
          // 장소별 고유 스케줄 ID: (원본ID * 1000) + 장소인덱스
          const uniqueScheduleId = schedule.id * 1000 + locIdx;

          // 기존 배정 수 계산 (Pending만 - Accepted는 이미 확정이므로 제외)
          const existingAssignments = (schedule.assignments || []).filter(
            (a) =>
              a.state === 'Pending' &&
              (a.trainingLocationId === loc.id || a.trainingLocationId === null),
          ).length;

          const required = (loc.instructorsNumbers || 2) - existingAssignments;

          // DEBUG: 필요인원 계산 로그
          console.log(
            `[DEBUG Algorithm] Unit:${unit.id} Schedule:${schedule.id} Loc:${loc.id} - needed:${loc.instructorsNumbers || 2} existing:${existingAssignments} required:${required > 0 ? required : 0}`,
          );

          schedules.push({
            id: uniqueScheduleId,
            date: schedule.date,
            requiredCount: required > 0 ? required : 0, // 음수 방지
          });
        }
      }

      return {
        id: unit.id,
        name: unit.name || `부대_${unit.id}`,
        region: unit.region || '',
        wideArea: unit.wideArea || '',
        schedules,
        trainingLocations: unit.trainingLocations.map((loc) => ({
          id: loc.id || 0,
          name: loc.originalPlace || '',
          instructorsNumbers: loc.instructorsNumbers ?? null,
        })),
      };
    });
  }

  /**
   * 강사 데이터 변환
   */
  private transformInstructors(rawInstructors: InstructorWithData[]): InstructorCandidate[] {
    return rawInstructors.map((instructor) => {
      const availableDates = instructor.availabilities.map((a) => toDateString(a.availableOn));

      return {
        userId: instructor.userId,
        name: instructor.User?.name || `강사_${instructor.userId}`,
        category: instructor.category ?? null,
        teamId: instructor.team?.id ?? instructor.teamId ?? null,
        teamName: instructor.team?.name ?? null,
        isTeamLeader: instructor.isTeamLeader ?? false,
        generation: instructor.generation ?? null,
        restrictedArea: instructor.restrictedArea ?? null,
        maxDistanceKm: null, // 추후 활용
        location: instructor.location ?? null,
        availableDates,
        priorityCredits: instructor.priorityCredit?.credits ?? 0,
        recentRejectionCount: 0, // 추후 별도 쿼리
        recentAssignmentCount: 0, // 추후 별도 쿼리
        monthlyAvailabilityCount: availableDates.length,
      };
    });
  }
}

export default new AssignmentAlgorithm();

// CommonJS 호환
module.exports = new AssignmentAlgorithm();
