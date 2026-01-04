// src/features/assignment/model/groupUnassignedUnits.ts
// 미배정 부대 그룹화 로직 - 부대별 + 장소별 + 날짜 중복 제거

import { UnitSchedule, UnitScheduleDetail } from '../assignmentApi';

// 장소별 스케줄 정보
export interface LocationSchedule {
  locationId: string;
  locationName: string;
  instructorsRequired: number;
  schedules: { date: string; scheduleId: string }[];
}

// 부대별 그룹화된 미배정 데이터
export interface GroupedUnassignedUnit {
  unitId: number;
  unitName: string;
  region: string;
  totalRequired: number;
  uniqueDates: string[]; // 중복 제거된 날짜 목록
  locations: LocationSchedule[];
  detail: UnitScheduleDetail; // 부대 상세 정보
}

/**
 * 미배정 부대 데이터를 부대별로 그룹화
 * - 같은 부대의 여러 장소/스케줄을 하나로 묶음
 * - 날짜 중복 제거
 * - 장소별 필요 인원 합산
 *
 * @param units - API에서 받은 미배정 부대 목록
 * @returns 부대별 그룹화된 데이터
 */
export const groupUnassignedUnits = (units: UnitSchedule[]): GroupedUnassignedUnit[] => {
  const unitMap = new Map<number, GroupedUnassignedUnit>();

  for (const unit of units) {
    // id 형식: "u-${unitId}-s-${scheduleId}-l-${locationId}"
    const parts = unit.id.split('-');
    const unitId = parseInt(parts[1], 10);
    const scheduleId = parts[3];
    const locationId = parts[5];

    // 부대 초기화
    if (!unitMap.has(unitId)) {
      unitMap.set(unitId, {
        unitId,
        unitName: unit.unitName,
        region: unit.location,
        totalRequired: 0,
        uniqueDates: [],
        locations: [],
        detail: unit.detail,
      });
    }

    const group = unitMap.get(unitId)!;

    // 장소 찾기 또는 추가
    let location = group.locations.find((l) => l.locationId === locationId);
    if (!location) {
      // actualCount를 기반으로 필요인원 계산 (강사당 36명 기준)
      const actualCount = unit.actualCount || 0;
      const traineesPerInstructor = 36; // TODO: 서버 설정값 사용
      const requiredInstructors =
        actualCount > 0 ? Math.floor(actualCount / traineesPerInstructor) || 1 : 1;

      location = {
        locationId,
        locationName: unit.originalPlace || `장소 ${locationId}`,
        instructorsRequired: requiredInstructors,
        schedules: [],
      };
      group.locations.push(location);
      // 장소 추가 시에만 인원 합산 (중복 방지)
      group.totalRequired += requiredInstructors;
    }

    // 스케줄 추가
    location.schedules.push({ date: unit.date, scheduleId });

    // 고유 날짜 추가
    if (!group.uniqueDates.includes(unit.date)) {
      group.uniqueDates.push(unit.date);
    }
  }

  // 날짜 정렬
  for (const group of unitMap.values()) {
    group.uniqueDates.sort();
    for (const loc of group.locations) {
      loc.schedules.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  return Array.from(unitMap.values());
};
