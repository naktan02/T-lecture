// server/src/domains/assignment/assignment.dto.ts

// Prisma 반환 타입과 호환되는 인터페이스 정의
interface TrainingLocationRaw {
  id: number | string;
  originalPlace: string | null;
  changedPlace?: string | null;
  instructorsNumbers?: number | null;
  plannedCount?: number | null;
  actualCount?: number | null;
  note?: string | null;
  hasInstructorLounge?: boolean | null;
  hasWomenRestroom?: boolean | null;
  hasCateredMeals?: boolean | null;
  hasHallLodging?: boolean | null;
  allowsPhoneBeforeAfter?: boolean | null;
}

interface ScheduleRaw {
  id: number;
  date: Date | null;
  assignments?: AssignmentRaw[];
}

interface AssignmentRaw {
  unitScheduleId: number;
  userId: number;
  state: string;
  classification?: string | null;
  User: {
    name: string | null;
    instructor?: {
      team?: { name: string | null } | null;
    } | null;
  };
}

interface UnitRaw {
  id: number;
  name: string | null;
  region: string | null;
  wideArea: string | null;
  addressDetail: string | null;
  officerName: string | null;
  officerPhone: string | null;
  officerEmail: string | null;
  workStartTime: Date | null;
  workEndTime?: Date | null;
  educationStart?: Date | null;
  educationEnd?: Date | null;
  lunchStartTime?: Date | null;
  lunchEndTime?: Date | null;
  trainingLocations: TrainingLocationRaw[];
  schedules: ScheduleRaw[];
}

interface AvailabilityRaw {
  availableOn: Date;
}

interface VirtueRaw {
  virtue?: { name: string | null } | null;
}

interface InstructorRaw {
  userId: number;
  category?: string | null;
  location?: string | null;
  generation?: number | null;
  isTeamLeader?: boolean;
  restrictedArea?: string | null;
  user: {
    name: string | null;
    userphoneNumber?: string | null;
    userEmail?: string | null;
  };
  team?: { name: string | null } | null;
  availabilities: AvailabilityRaw[];
  virtues: VirtueRaw[];
}

/**
 * 날짜를 KST(한국 시간) 문자열(YYYY-MM-DD)로 변환
 */
const toKSTDateString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  const d = new Date(date);
  // 한국 시간(UTC+9) 오프셋 적용
  const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[0];
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

  toHierarchicalResponse(unitsWithAssignments: UnitRaw[]) {
    return unitsWithAssignments.map((unit) => {
      let totalRequired = 0;
      let totalAssigned = 0;

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

          const assignedInstructors = (schedule.assignments || [])
            .filter((a: AssignmentRaw) => a.state === 'Active')
            .map((assign: AssignmentRaw) => {
              totalAssigned++;
              return {
                assignmentId: assign.unitScheduleId + '-' + assign.userId,
                unitScheduleId: assign.unitScheduleId,
                instructorId: assign.userId,
                name: assign.User.name,
                team: assign.User.instructor?.team?.name || '소속없음',
                role: assign.classification,
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
        totalAssigned,
        progress: totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 0,
        trainingLocations: trainingLocations,
      };
    });
  }
}

export default new AssignmentDTO();

// CommonJS 호환
module.exports = new AssignmentDTO();
