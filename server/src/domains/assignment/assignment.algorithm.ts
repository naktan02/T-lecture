// server/src/domains/assignment/assignment.algorithm.ts
// 배정 알고리즘 - 엔진 어댑터
// 기존 service와의 호환성을 유지하면서 새 engine을 사용

import {
  AssignmentEngine,
  InstructorCandidate,
  UnitData,
  ScheduleData,
  EngineResult,
} from './engine';

type ExecuteOptions = {
  traineesPerInstructor?: number;
  blockedInstructorIdsBySchedule?: Map<number, Set<number>>;
  recentAssignmentCountByInstructorId?: Map<number, number>;
  recentRejectionCountByInstructorId?: Map<number, number>;
  /** 디버그용: 상위 K명의 breakdown 수집 (0이면 수집 안 함) */
  debugTopK?: number;
};

// =========================================
// 입력 타입 (기존 형태 유지)
// =========================================

interface TrainingLocation {
  id?: number;
  originalPlace?: string | null;
  actualCount?: number | null;
  plannedCount?: number | null; // 간여인원이 없을 때 계획인원 사용
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
  isStaffLocked?: boolean;
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
  role: string | null;
  // 이름 정보 (가독성)
  instructorName: string;
  unitName: string;
  trainingLocationName: string | null;
  scheduleDate: string;
}

interface ExecuteResult {
  assignments: AssignmentResult[];
  debug?: EngineResult['debug'];
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
  constructor() {}

  /**
   * 자동 배정 알고리즘 실행
   */
  execute(
    rawUnits: UnitWithSchedules[],
    rawInstructors: InstructorWithData[],
    options: ExecuteOptions = {},
  ): ExecuteResult {
    const traineesPerInstructor = options.traineesPerInstructor ?? 36;

    const engine = new AssignmentEngine({
      traineesPerInstructor,
      rejectionPenaltyMonths: 6,
      fairnessLookbackMonths: 3,
    });
    // 1. 데이터 변환
    const units = this.transformUnits(rawUnits, traineesPerInstructor);
    const candidates = this.transformInstructors(rawInstructors, options);

    if (units.length === 0 || candidates.length === 0) {
      return { assignments: [] };
    }

    // 2. 엔진 실행
    const result = engine.execute(units, candidates, {
      blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
      debugTopK: options?.debugTopK ?? 0,
    });

    // 3. 결과 변환 (기존 형식으로 + 이름 정보 추가)
    // uniqueScheduleId = (원본scheduleId * 1000) + locationIndex

    // 강사 ID → 이름 맵
    const instructorNameMap = new Map<number, string>();
    for (const inst of rawInstructors) {
      instructorNameMap.set(inst.userId, inst.User?.name || `강사_${inst.userId}`);
    }

    const assignments = result.assignments.map((a) => {
      const originalScheduleId = Math.floor(a.unitScheduleId / 1000);
      const locationIndex = a.unitScheduleId % 1000;

      // 유닛 찾기
      const unit = rawUnits.find((u) => u.schedules.some((s) => s.id === originalScheduleId));
      const schedule = unit?.schedules.find((s) => s.id === originalScheduleId);
      const trainingLocation = unit?.trainingLocations[locationIndex];
      const trainingLocationId = trainingLocation?.id ?? null;

      return {
        unitScheduleId: originalScheduleId,
        instructorId: a.instructorId,
        trainingLocationId,
        role: a.role ?? null, // 엔진 결과의 role 사용 (Head/Supervisor/null)
        // 이름 정보
        instructorName: instructorNameMap.get(a.instructorId) || `강사_${a.instructorId}`,
        unitName: unit?.name || `부대_${unit?.id}`,
        trainingLocationName: trainingLocation?.originalPlace || null,
        scheduleDate: schedule ? toDateString(schedule.date) : '',
      };
    });

    return {
      assignments,
      debug: result.debug,
    };
  }

  /**
   * 부대 데이터 변환
   * - 장소별로 스케줄 분리하여 배정
   * - uniqueScheduleId = (원본scheduleId * 1000) + locationIndex
   */
  private transformUnits(rawUnits: UnitWithSchedules[], traineesPerInstructor: number): UnitData[] {
    return rawUnits.map((unit) => {
      // 장소별로 스케줄 분리
      const schedules: ScheduleData[] = [];

      for (const schedule of unit.schedules) {
        for (let locIdx = 0; locIdx < unit.trainingLocations.length; locIdx++) {
          const loc = unit.trainingLocations[locIdx];
          // 장소별 고유 스케줄 ID: (원본ID * 1000) + 장소인덱스
          const uniqueScheduleId = schedule.id * 1000 + locIdx;

          // 기존 배정 수 계산 (Pending + Accepted를 포함해야 "부족분만 추가 배정"이 안정적임)
          const existingAssignments = (schedule.assignments || []).filter(
            (a) =>
              ['Pending', 'Accepted'].includes(a.state) &&
              (a.trainingLocationId === loc.id || a.trainingLocationId === null),
          ).length;

          // 참여인원 우선, 없으면 계획인원 사용 (fallback)
          const headcount = loc.actualCount ?? loc.plannedCount ?? 0;
          const computedNeeded = Math.floor(headcount / Math.max(1, traineesPerInstructor)) || 1;
          const needed = computedNeeded;

          const required = Math.max(0, needed - existingAssignments);

          // DEBUG: 필요인원 계산 로그
          console.log(
            `[DEBUG Algorithm] Unit:${unit.id} Schedule:${schedule.id} Loc:${loc.id} - needed:${needed ?? 0} existing:${existingAssignments} required:${required > 0 ? required : 0}`,
          );

          // isStaffLocked=true인 부대는 필요인원을 0으로 설정하여 배정 생략
          const finalRequired = unit.isStaffLocked ? 0 : required > 0 ? required : 0;

          schedules.push({
            id: uniqueScheduleId,
            date: schedule.date,
            requiredCount: finalRequired,
            isBlocked: unit.isStaffLocked,
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
        })),
      };
    });
  }

  /**
   * 강사 데이터 변환
   */
  private transformInstructors(
    rawInstructors: InstructorWithData[],
    options: ExecuteOptions,
  ): InstructorCandidate[] {
    return rawInstructors.map((instructor) => {
      const availableDates = instructor.availabilities.map((a) => toDateString(a.availableOn));
      const recentAssignmentCount =
        options.recentAssignmentCountByInstructorId?.get(instructor.userId) ?? 0;
      const recentRejectionCount =
        options.recentRejectionCountByInstructorId?.get(instructor.userId) ?? 0;
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
        recentRejectionCount,
        recentAssignmentCount,
        monthlyAvailabilityCount: availableDates.length,
      };
    });
  }
}

export default new AssignmentAlgorithm();

// CommonJS 호환
module.exports = new AssignmentAlgorithm();
