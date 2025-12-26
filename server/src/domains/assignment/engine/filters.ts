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
 * - 각 날짜에 주강사 최소 1명 확보 필요
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

/**
 * 연수자 필터
 * - 연수자(Practicum)는 같은 팀의 주강사와 함께 배정 불가
 */
export const traineeFilter: AssignmentFilter = {
  id: 'TRAINEE',
  name: '연수자 필터',
  description: '연수자는 같은 팀의 주강사와 함께 배정 불가',
  check(candidate: InstructorCandidate, context: AssignmentContext): boolean {
    if (candidate.category !== 'Practicum') return true;

    // 연수자는 같은 팀 주강사와 함께 배정 불가
    const sameTeamMainAssigned = context.currentAssignments.some(
      (a) =>
        a.scheduleId === context.currentScheduleId &&
        a.teamId === candidate.teamId &&
        a.category === 'Main',
    );
    return !sameTeamMainAssigned;
  },
};

/**
 * 모든 필터 목록
 */
export const allFilters: AssignmentFilter[] = [
  availabilityFilter,
  distanceFilter,
  areaRestrictionFilter,
  mainInstructorFilter,
  traineeFilter,
];
