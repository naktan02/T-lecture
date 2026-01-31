// server/src/domains/assignment/engine/filters.ts
// 배정 알고리즘 Hard 필터 모음

import { AssignmentFilter, InstructorCandidate, AssignmentContext } from './assignment.types';

/**
 * 가용일 필터
 * - 해당 날짜에 강사가 가능일로 등록했는지 확인
 */
export const availabilityFilter: AssignmentFilter = {
  id: 'AVAILABILITY',
  name: '가용일 필터',
  description: '해당 날짜에 강사가 가능일로 등록했는지 확인',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    return candidate.availableDates.includes(context.currentScheduleDate);
  },
};

/**
 * 거리 제한 필터
 * - 개인별 최대 거리 제한 초과 여부 확인
 */
export const distanceFilter: AssignmentFilter = {
  id: 'DISTANCE_LIMIT',
  name: '거리 제한 필터',
  description: '개인별 최대 거리 제한 초과 여부 확인',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    if (!candidate.maxDistanceKm) return true; // 제한 없으면 통과
    const key = `${candidate.userId}-${context.currentUnitId}`;
    const distance = context.instructorDistances.get(key) ?? Infinity;
    return distance <= candidate.maxDistanceKm;
  },
};

/**
 * 지역 제한 필터
 * - 개인별 불가 지역 해당 여부 확인
 */
export const areaRestrictionFilter: AssignmentFilter = {
  id: 'AREA_RESTRICTION',
  name: '지역 제한 필터',
  description: '개인별 불가 지역 해당 여부 확인',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    if (!candidate.restrictedArea) return true; // 제한 없으면 통과
    // restrictedArea가 쉼표로 구분된 지역 목록이라고 가정
    const restrictedList = candidate.restrictedArea.split(',').map((s) => s.trim());
    return !restrictedList.includes(context.currentUnitRegion);
  },
};

/**
 * 주강사 필수 필터
 * - 각 날짜/장소에 주강사(Main) 최소 1명 확보 필요
 */
export const mainInstructorFilter: AssignmentFilter = {
  id: 'MAIN_REQUIRED',
  name: '주강사 필수 필터',
  description: '각 날짜에 주강사 최소 1명 확보 필요',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    // 이미 주강사가 배정되어 있으면 모든 후보 허용
    const hasMainInstructor = context.currentAssignments.some(
      (a) => a.scheduleId === context.currentScheduleId && a.category === 'Main',
    );
    if (hasMainInstructor) return true;

    // 없으면 주강사만 허용
    return candidate.category === 'Main';
  },
};

// NOTE: traineeFilter 제거됨 - Practicum은 같은 팀 주강사와 함께 배정 가능

/**
 * 이미 배정된 강사 필터
 * - 해당 날짜에 이미 다른 스케줄에 배정된 강사 제외
 */
export const alreadyAssignedFilter: AssignmentFilter = {
  id: 'ALREADY_ASSIGNED',
  name: '중복 배정 방지 필터',
  description: '해당 날짜에 이미 배정된 강사 제외',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    // 같은 날짜에 이미 배정된 강사인지 확인
    const isAlreadyAssigned = context.currentAssignments.some(
      (a) => a.date === context.currentScheduleDate && a.instructorId === candidate.userId,
    );
    return !isAlreadyAssigned; // 배정되지 않은 경우만 통과
  },
};

export const canceledBlockFilter: AssignmentFilter = {
  id: 'CANCELED_BLOCK',
  name: '취소자 재배정 방지 필터',
  description: '관리자 취소(Canceled) 이력이 있는 강사는 해당 일정에 재배정하지 않음',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    const map = context.blockedInstructorIdsBySchedule;
    if (!map) return true;

    // uniqueScheduleId = (원본 scheduleId * 1000) + locIdx
    const originalScheduleId = Math.floor(context.currentScheduleId / 1000);
    const blocked = map.get(originalScheduleId);
    if (!blocked) return true;
    return !blocked.has(candidate.userId);
  },
};

/**
 * 실습강사 거리 제한 필터 (Practicum)
 * - 실습강사는 집에서 가까운 곳만 배정 (DB 설정값 사용)
 */
export const internDistanceFilter: AssignmentFilter = {
  id: 'INTERN_DISTANCE',
  name: '실습강사 거리 제한',
  description: '실습강사는 설정된 최대 거리 이내만 배정',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    // Practicum이 아니면 통과
    if (candidate.category !== 'Practicum') return true;

    // 거리 확인 (DB에서 가져온 설정값 사용)
    const maxDistance = context.config.internMaxDistanceKm;
    const key = `${candidate.userId}-${context.currentUnitId}`;
    const distance = context.instructorDistances.get(key) ?? Infinity;
    return distance <= maxDistance;
  },
};

/**
 * 보조강사 거리 제한 필터 (Assistant만)
 * - 보조강사(Assistant)만 설정된 거리 이내 배정 (null이면 제한 없음)
 * - Co(부강사)는 거리 제한 없음
 */
export const subDistanceFilter: AssignmentFilter = {
  id: 'SUB_DISTANCE',
  name: '보조강사 거리 제한',
  description: '보조강사(Assistant)만 설정된 최대 거리 이내 배정',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    // Assistant가 아니면 통과 (Co는 거리 제한 없음)
    if (candidate.category !== 'Assistant') return true;

    // 거리 제한이 null이면 제한 없음
    const maxDistance = context.config.subMaxDistanceKm;
    if (maxDistance === null) return true;

    const key = `${candidate.userId}-${context.currentUnitId}`;
    const distance = context.instructorDistances.get(key) ?? Infinity;
    return distance <= maxDistance;
  },
};

/**
 * 모든 필터 목록
 */
export const allFilters: AssignmentFilter[] = [
  availabilityFilter,
  alreadyAssignedFilter,
  canceledBlockFilter,
  distanceFilter,
  areaRestrictionFilter,
  internDistanceFilter,
  subDistanceFilter,
  mainInstructorFilter,
  // traineeFilter 제거 - Practicum은 같은 팀 주강사와 배정 가능
];
