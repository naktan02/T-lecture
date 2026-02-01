// server/src/domains/assignment/engine/adapter.ts
// 배정 알고리즘 어댑터 - 서비스와 엔진 사이의 데이터 변환
// 변경: TrainingPeriod 단위 배정으로 리팩토링

import {
  AssignmentEngine,
  InstructorCandidate,
  UnitData,
  TrainingPeriodData,
  ScheduleData,
  LocationData,
  EngineResult,
} from './index';
import logger from '../../../config/logger';

type ExecuteOptions = {
  traineesPerInstructor?: number;
  blockedInstructorIdsBySchedule?: Map<number, Set<number>>;
  recentAssignmentCountByInstructorId?: Map<number, number>;
  recentRejectionCountByInstructorId?: Map<number, number>;
  /** 디버그용: 상위 K명의 breakdown 수집 (0이면 수집 안 함) */
  debugTopK?: number;
  /** 실습강사 최대 배정 거리 (km) */
  internMaxDistanceKm?: number;
  /** 보조강사 최대 배정 거리 (km), null=제한없음 */
  subMaxDistanceKm?: number | null;
  /** 강사-부대 거리 데이터 (km 단위): `${instructorId}-${unitId}` → km */
  instructorDistances?: Map<string, number>;
};

// =========================================
// 입력 타입 (기존 형태 유지 + TrainingPeriod 추가)
// =========================================

interface ScheduleLocation {
  unitScheduleId: number;
  trainingLocationId: number;
  plannedCount?: number | null;
  actualCount?: number | null;
  requiredCount?: number | null;
}

interface TrainingLocation {
  id?: number;
  originalPlace?: string | null;
  actualCount?: number | null;
  plannedCount?: number | null;
  requiredCount?: number | null;
  scheduleLocations?: ScheduleLocation[];
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
  scheduleLocations?: ScheduleLocation[];
}

interface TrainingPeriod {
  id: number;
  isStaffLocked?: boolean;
  excludedDates?: string[];
  locations?: TrainingLocation[];
  schedules?: Schedule[];
}

interface UnitWithSchedules {
  id: number;
  name?: string | null;
  region?: string | null;
  wideArea?: string | null;
  trainingPeriods?: TrainingPeriod[];
  // Legacy 지원
  trainingLocations?: TrainingLocation[];
  schedules?: Schedule[];
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
  return date.toISOString().split('T')[0];
}

// =========================================
// 장소 분배 유틸
// =========================================

interface LocationInfo {
  id: number;
  name: string;
  requiredCount: number;
}

/**
 * 강사를 장소별로 분배
 * - 같은 TrainingPeriod 내에서 강사는 같은 장소에 배정
 * - 이미 배정된 장소가 있으면 그 장소 유지
 */
function distributeToLocations(
  assignments: { unitScheduleId: number; instructorId: number }[],
  scheduleLocationMap: Map<number, LocationInfo[]>,
  instructorLocationPreference: Map<string, number>,
  trainingPeriodIdByScheduleId: Map<number, number>,
): { unitScheduleId: number; instructorId: number; trainingLocationId: number | null }[] {
  // 스케줄별로 그룹화
  const bySchedule = new Map<number, typeof assignments>();
  for (const a of assignments) {
    if (!bySchedule.has(a.unitScheduleId)) {
      bySchedule.set(a.unitScheduleId, []);
    }
    bySchedule.get(a.unitScheduleId)!.push(a);
  }

  const result: {
    unitScheduleId: number;
    instructorId: number;
    trainingLocationId: number | null;
  }[] = [];

  for (const [scheduleId, scheduleAssignments] of bySchedule) {
    const locations = scheduleLocationMap.get(scheduleId) || [];
    const trainingPeriodId = trainingPeriodIdByScheduleId.get(scheduleId) || 0;

    if (locations.length === 0) {
      // 장소 없으면 null로
      for (const a of scheduleAssignments) {
        result.push({ ...a, trainingLocationId: null });
      }
      continue;
    }

    // 장소별 현재 배정 수 추적
    const locationAssignmentCount = new Map<number, number>();
    for (const loc of locations) {
      locationAssignmentCount.set(loc.id, 0);
    }

    for (const a of scheduleAssignments) {
      // 1. 이미 선호 장소가 있는지 확인 (같은 TrainingPeriod 내)
      const prefKey = `${a.instructorId}_${trainingPeriodId}`;
      const preferredLocationId = instructorLocationPreference.get(prefKey);

      let assignedLocationId: number | null = null;

      if (preferredLocationId && locations.some((l) => l.id === preferredLocationId)) {
        // 선호 장소가 이 스케줄에도 존재하면 그 장소로
        assignedLocationId = preferredLocationId;
      } else {
        // 2. 가장 여유 있는 장소에 배정
        let bestLocation: LocationInfo | null = null;
        let bestSlack = -Infinity;

        for (const loc of locations) {
          const current = locationAssignmentCount.get(loc.id) || 0;
          const slack = loc.requiredCount - current;
          if (slack > bestSlack) {
            bestSlack = slack;
            bestLocation = loc;
          }
        }

        assignedLocationId = bestLocation?.id ?? locations[0]?.id ?? null;
      }

      // 배정 수 증가
      if (assignedLocationId !== null) {
        locationAssignmentCount.set(
          assignedLocationId,
          (locationAssignmentCount.get(assignedLocationId) || 0) + 1,
        );
        // 선호 장소 업데이트
        instructorLocationPreference.set(prefKey, assignedLocationId);
      }

      result.push({ ...a, trainingLocationId: assignedLocationId });
    }
  }

  return result;
}

// =========================================
// 알고리즘 클래스
// =========================================

class AssignmentAlgorithm {
  constructor() {}

  /**
   * 자동 배정 알고리즘 실행 (TrainingPeriod 단위)
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
      internMaxDistanceKm: options.internMaxDistanceKm ?? 50, // 기본값 50km
      subMaxDistanceKm: options.subMaxDistanceKm ?? null, // null = 제한없음
    });

    // 1. 데이터 변환 (TrainingPeriod 단위)
    const { units, scheduleLocationMap, trainingPeriodIdByScheduleId } = this.transformUnits(
      rawUnits,
      traineesPerInstructor,
    );
    const candidates = this.transformInstructors(rawInstructors, options);

    if (units.length === 0 || candidates.length === 0) {
      return { assignments: [] };
    }

    // 2. 엔진 실행
    const result = engine.execute(units, candidates, {
      blockedInstructorIdsBySchedule: options?.blockedInstructorIdsBySchedule,
      debugTopK: options?.debugTopK ?? 0,
      instructorDistances: options?.instructorDistances,
    });

    // 3. 장소 분배 (같은 TrainingPeriod 내 일관성 유지)
    const instructorLocationPreference = new Map<string, number>();

    // 기존 배정에서 선호 장소 추출
    for (const unit of rawUnits) {
      for (const period of unit.trainingPeriods || []) {
        for (const schedule of period.schedules || []) {
          for (const assignment of schedule.assignments || []) {
            if (
              assignment.trainingLocationId &&
              ['Pending', 'Accepted'].includes(assignment.state)
            ) {
              const key = `${assignment.userId}_${period.id}`;
              instructorLocationPreference.set(key, assignment.trainingLocationId);
            }
          }
        }
      }
    }

    const distributedAssignments = distributeToLocations(
      result.assignments,
      scheduleLocationMap,
      instructorLocationPreference,
      trainingPeriodIdByScheduleId,
    );

    // 4. 결과 변환 (이름 정보 추가)
    const instructorNameMap = new Map<number, string>();
    for (const inst of rawInstructors) {
      instructorNameMap.set(inst.userId, inst.User?.name || `강사_${inst.userId}`);
    }

    // 스케줄 정보 맵
    const scheduleInfoMap = new Map<
      number,
      { unitName: string; scheduleDate: string; trainingPeriodId: number }
    >();
    const locationNameMap = new Map<number, string>();

    for (const unit of rawUnits) {
      for (const period of unit.trainingPeriods || []) {
        for (const schedule of period.schedules || []) {
          scheduleInfoMap.set(schedule.id, {
            unitName: unit.name || `부대_${unit.id}`,
            scheduleDate: toDateString(schedule.date),
            trainingPeriodId: period.id,
          });
        }
        for (const loc of period.locations || []) {
          if (loc.id) {
            locationNameMap.set(loc.id, loc.originalPlace || '');
          }
        }
      }
    }

    const assignments: AssignmentResult[] = distributedAssignments.map((a) => {
      const scheduleInfo = scheduleInfoMap.get(a.unitScheduleId);

      return {
        unitScheduleId: a.unitScheduleId,
        instructorId: a.instructorId,
        trainingLocationId: a.trainingLocationId,
        role: null, // 역할은 나중에 계산
        instructorName: instructorNameMap.get(a.instructorId) || `강사_${a.instructorId}`,
        unitName: scheduleInfo?.unitName || '',
        trainingLocationName: a.trainingLocationId
          ? locationNameMap.get(a.trainingLocationId) || null
          : null,
        scheduleDate: scheduleInfo?.scheduleDate || '',
      };
    });

    return {
      assignments,
      debug: result.debug,
    };
  }

  /**
   * 부대 데이터 변환 (TrainingPeriod 단위)
   * - 장소별 분리 제거
   * - TrainingPeriod별 총 필요인원 계산
   */
  private transformUnits(
    rawUnits: UnitWithSchedules[],
    traineesPerInstructor: number,
  ): {
    units: UnitData[];
    scheduleLocationMap: Map<number, LocationInfo[]>;
    trainingPeriodIdByScheduleId: Map<number, number>;
  } {
    const scheduleLocationMap = new Map<number, LocationInfo[]>();
    const trainingPeriodIdByScheduleId = new Map<number, number>();

    const units: UnitData[] = rawUnits.map((unit) => {
      const trainingPeriods: TrainingPeriodData[] = [];

      for (const period of unit.trainingPeriods || []) {
        const schedules: ScheduleData[] = [];
        const locations: LocationData[] = [];

        // 장소 정보 변환
        for (const loc of period.locations || []) {
          locations.push({
            id: loc.id || 0,
            name: loc.originalPlace || '',
          });
        }

        for (const schedule of period.schedules || []) {
          // TrainingPeriod ID 매핑
          trainingPeriodIdByScheduleId.set(schedule.id, period.id);

          // 스케줄별 장소 정보 구성
          const locInfos: LocationInfo[] = [];
          let totalRequired = 0;

          for (const loc of period.locations || []) {
            // 스케줄-장소별 인원 정보 찾기
            const schedLoc = schedule.scheduleLocations?.find(
              (sl) => sl.trainingLocationId === loc.id,
            );

            // 필요인원 계산
            const headcount =
              schedLoc?.actualCount ??
              schedLoc?.plannedCount ??
              loc.actualCount ??
              loc.plannedCount ??
              0;
            const calculatedNeeded =
              Math.floor(headcount / Math.max(1, traineesPerInstructor)) || 1;
            const locRequired = schedLoc?.requiredCount ?? loc.requiredCount ?? calculatedNeeded;

            totalRequired += locRequired;

            locInfos.push({
              id: loc.id || 0,
              name: loc.originalPlace || '',
              requiredCount: locRequired,
            });
          }

          // 장소가 없으면 기본값 사용
          if (locInfos.length === 0) {
            totalRequired = 2;
          }

          scheduleLocationMap.set(schedule.id, locInfos);

          // 기존 배정 수 계산
          const existingAssignments = (schedule.assignments || []).filter((a) =>
            ['Pending', 'Accepted'].includes(a.state),
          ).length;

          const required = Math.max(0, totalRequired - existingAssignments);

          // 로그
          logger.debug(
            `[Algorithm] Unit:${unit.id} Period:${period.id} Schedule:${schedule.id} - ` +
              `totalRequired:${totalRequired} existing:${existingAssignments} needed:${required}`,
          );

          schedules.push({
            id: schedule.id, // 원본 ID 그대로 사용 (인코딩 제거)
            date: schedule.date,
            requiredCount: period.isStaffLocked ? 0 : required,
            isBlocked: period.isStaffLocked,
          });
        }

        trainingPeriods.push({
          id: period.id,
          unitId: unit.id,
          unitName: unit.name || `부대_${unit.id}`,
          region: unit.region || '',
          wideArea: unit.wideArea || '',
          isStaffLocked: period.isStaffLocked ?? false,
          excludedDates: period.excludedDates || [],
          schedules,
          locations,
        });
      }

      return {
        id: unit.id,
        name: unit.name || `부대_${unit.id}`,
        region: unit.region || '',
        wideArea: unit.wideArea || '',
        trainingPeriods,
      };
    });

    return { units, scheduleLocationMap, trainingPeriodIdByScheduleId };
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
        maxDistanceKm: null,
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
