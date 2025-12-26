// server/src/domains/assignment/assignment.dto.ts
import {
  UnitRaw,
  InstructorRaw,
  TrainingLocationRaw,
  ScheduleRaw,
  AssignmentRaw,
  AvailabilityRaw,
  VirtueRaw,
} from '../../types/assignment.types';

/**
 * 날짜를 KST(한국 시간) 문자열(YYYY-MM-DD)로 변환
 */
const toKSTDateString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  const d = new Date(date);
  // 한국 시간대로 변환 후 날짜만 추출
  const kstDateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  return kstDateStr;
};

/**
 * 시간을 KST HH:mm 형태로 변환
 */
const toKSTTimeString = (date: Date | string | null | undefined): string => {
  if (!date) return '09:00';
  const d = new Date(date);
  const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[1].substring(0, 5);
};

class AssignmentDTO {
  /**
   * 배정 후보 데이터(부대+강사)를 프론트엔드용 포맷으로 변환
   */
  toCandidateResponse(unitsRaw: UnitRaw[], instructorsRaw: InstructorRaw[]) {
    const unassignedUnits = this.mapUnitsToCards(unitsRaw);
    const availableInstructors = this.mapInstructorsToCards(instructorsRaw);

    return {
      unassignedUnits,
      availableInstructors,
    };
  }

  // 내부 로직: 부대 -> 카드 변환
  mapUnitsToCards(units: UnitRaw[]) {
    const list: unknown[] = [];
    units.forEach((unit) => {
      // 1. 교육장소 목록 준비
      const locations =
        unit.trainingLocations && unit.trainingLocations.length > 0
          ? unit.trainingLocations
          : [{ id: 'def', originalPlace: '교육장소 미정', instructorsNumbers: 0 }];

      // 2. 스케줄(날짜)별로 반복
      unit.schedules.forEach((schedule: ScheduleRaw) => {
        const dateStr = toKSTDateString(schedule.date);

        // 3. 교육장소별로 카드 생성
        locations.forEach((loc: TrainingLocationRaw) => {
          list.push({
            type: 'UNIT',
            id: `u-${unit.id}-s-${schedule.id}-l-${loc.id}`,

            // [Card UI]
            unitName: unit.name,
            originalPlace: loc.originalPlace,
            instructorsNumbers: loc.instructorsNumbers,
            date: dateStr,
            time: toKSTTimeString(unit.workStartTime),
            location: unit.region,

            // [Modal Detail]
            detail: {
              unitName: unit.name,
              region: unit.region,
              wideArea: unit.wideArea,
              address: unit.addressDetail,
              officerName: unit.officerName,
              officerPhone: unit.officerPhone,
              officerEmail: unit.officerEmail,
              originalPlace: loc.originalPlace,
              changedPlace: loc.changedPlace,
              instructorsNumbers: loc.instructorsNumbers,
              plannedCount: loc.plannedCount,
              actualCount: loc.actualCount,
              note: loc.note,

              educationStart: toKSTDateString(unit.educationStart),
              educationEnd: toKSTDateString(unit.educationEnd),
              workStartTime: toKSTTimeString(unit.workStartTime),
              workEndTime: toKSTTimeString(unit.workEndTime),
              lunchStartTime: toKSTTimeString(unit.lunchStartTime),
              lunchEndTime: toKSTTimeString(unit.lunchEndTime),

              hasInstructorLounge: loc.hasInstructorLounge,
              hasWomenRestroom: loc.hasWomenRestroom,
              hasCateredMeals: loc.hasCateredMeals,
              hasHallLodging: loc.hasHallLodging,
              allowsPhoneBeforeAfter: loc.allowsPhoneBeforeAfter,
            },
          });
        });
      });
    });
    return list;
  }

  // 내부 로직: 강사 -> 카드 변환
  mapInstructorsToCards(instructors: InstructorRaw[]) {
    return instructors.map((inst) => {
      const availableDates = inst.availabilities.map((a: AvailabilityRaw) =>
        toKSTDateString(a.availableOn),
      );

      return {
        type: 'INSTRUCTOR',
        id: inst.userId,

        // [Card UI]
        name: inst.user.name,
        teamName: inst.team?.name || '소속없음',
        category: inst.category,
        location: inst.location
          ? inst.location.split(' ')[0] + ' ' + (inst.location.split(' ')[1] || '')
          : '지역미정',
        availableDates: availableDates,

        // [Modal Detail]
        detail: {
          teamName: inst.team?.name,
          category: inst.category,
          phoneNumber: inst.user.userphoneNumber,
          email: inst.user.userEmail,
          address: inst.location,
          generation: inst.generation,
          isTeamLeader: inst.isTeamLeader,
          restrictedArea: inst.restrictedArea,
          virtues: inst.virtues
            .map((v: VirtueRaw) => (v.virtue ? v.virtue.name : ''))
            .filter(Boolean)
            .join(', '),
          availableDates: availableDates,
        },
      };
    });
  }

  /**
   * 계층형 응답 변환 (상태 필터링 지원)
   * @param stateFilter - 'Pending' | 'Accepted' | 'all' (default: 'all')
   */
  toHierarchicalResponse(
    unitsWithAssignments: UnitRaw[],
    stateFilter: 'Pending' | 'Accepted' | 'all' = 'all',
  ) {
    return unitsWithAssignments.map((unit) => {
      let totalRequired = 0;
      let totalAssigned = 0;
      const assignedInstructorIds = new Set<number>();
      // 1. 교육장소별 데이터 구성
      const locations =
        unit.trainingLocations && unit.trainingLocations.length > 0
          ? unit.trainingLocations
          : [{ id: 'default', originalPlace: '교육장소 미정', instructorsNumbers: 0 }];

      const trainingLocations = locations.map((loc: TrainingLocationRaw) => {
        const daysCount = unit.schedules.length;
        totalRequired += (loc.instructorsNumbers || 0) * daysCount;

        // 2. 각 장소 안에서 '날짜별' 스케줄 구성
        const dates = unit.schedules.map((schedule: ScheduleRaw) => {
          const dateStr = toKSTDateString(schedule.date);

          // 해당 장소(loc.id)에 배정된 강사만 필터링 (상태 필터 적용)
          const assignedInstructors = (schedule.assignments || [])
            .filter(
              (a: AssignmentRaw) =>
                (stateFilter === 'all'
                  ? a.state === 'Pending' || a.state === 'Accepted'
                  : a.state === stateFilter) &&
                (a.trainingLocationId === loc.id || a.trainingLocationId === null),
            )
            .map((assign: AssignmentRaw) => {
              totalAssigned++;
              assignedInstructorIds.add(assign.userId);
              return {
                assignmentId: assign.unitScheduleId + '-' + assign.userId,
                unitScheduleId: assign.unitScheduleId,
                instructorId: assign.userId,
                name: assign.User.name,
                team: assign.User.instructor?.team?.name || '소속없음',
                role: assign.classification,
                trainingLocationId: assign.trainingLocationId,
              };
            });

          return {
            date: dateStr,
            unitScheduleId: schedule.id,
            requiredCount: loc.instructorsNumbers || 0,
            instructors: assignedInstructors,
          };
        });

        return {
          id: loc.id,
          name: loc.originalPlace || '장소 미명',
          dates: dates,
        };
      });

      // 3. 부대 전체 요약 정보
      const startDate = unit.schedules[0] ? toKSTDateString(unit.schedules[0].date) : '-';
      const endDate = unit.schedules[unit.schedules.length - 1]
        ? toKSTDateString(unit.schedules[unit.schedules.length - 1].date)
        : '-';

      return {
        unitId: unit.id,
        unitName: unit.name,
        region: `${unit.wideArea} ${unit.region}`,
        period: `${startDate} ~ ${endDate}`,
        totalRequired,
        totalAssigned: assignedInstructorIds.size,
        progress:
          totalRequired > 0 ? Math.round((assignedInstructorIds.size / totalRequired) * 100) : 0,
        trainingLocations: trainingLocations,
      };
    });
  }
}

export default new AssignmentDTO();

// CommonJS 호환
module.exports = new AssignmentDTO();
