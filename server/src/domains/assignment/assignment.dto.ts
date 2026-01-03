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

/**
 * 필요 강사 수 계산 (참여인원 / 강사당교육생수)
 */
const calcRequiredInstructors = (
  actualCount: number | null | undefined,
  traineesPerInstructor: number,
): number => {
  if (!actualCount || actualCount <= 0) return 1; // 기본값 1명
  return Math.floor(actualCount / traineesPerInstructor) || 1;
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
          : [{ id: 'def', originalPlace: '교육장소 미정', actualCount: 0 }];

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
            actualCount: loc.actualCount,
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
   * 계층형 응답 변환 (분류 필터링 지원 - Temporary=배정작업공간, Confirmed=확정)
   * @param classificationFilter - 'Temporary' | 'Confirmed' | 'all' (default: 'all')
   * @param traineesPerInstructor - 강사당 교육생 수 (필요인원 계산용)
   */
  toHierarchicalResponse(
    unitsWithAssignments: UnitRaw[],
    classificationFilter: 'Temporary' | 'Confirmed' | 'all' = 'all',
    traineesPerInstructor: number = 36,
  ) {
    return (
      unitsWithAssignments
        // 1단계: 부대별 상태 계산
        .map((unit) => {
          // 부대가 "Confirmed" 상태인지 판단:
          // 모든 스케줄의 필요 인원이 Accepted 상태로 채워져 있으면 Confirmed
          const locations =
            unit.trainingLocations && unit.trainingLocations.length > 0
              ? unit.trainingLocations
              : [{ id: 'default', originalPlace: '교육장소 미정', actualCount: 0 }];

          let isUnitConfirmed = true;
          const isStaffLocked = (unit as any).isStaffLocked ?? false;

          // 인원고정인 경우: Pending 없고 최소 1명 이상 Accepted면 확정
          if (isStaffLocked) {
            let hasPending = false;
            let hasAccepted = false;
            for (const schedule of unit.schedules as ScheduleRaw[]) {
              for (const a of (schedule.assignments || []) as AssignmentRaw[]) {
                if (a.state === 'Pending') hasPending = true;
                if (a.state === 'Accepted') hasAccepted = true;
              }
            }
            isUnitConfirmed = !hasPending && hasAccepted;
          } else {
            // 일반 경우:
            // 1) 필요 인원 이상이 Accepted 상태
            // 2) Pending 상태인 배정이 없어야 함 (추가 배정 인원도 모두 수락해야 확정)
            for (const loc of locations as TrainingLocationRaw[]) {
              // 동적 계산: actualCount / traineesPerInstructor
              const requiredPerDay = calcRequiredInstructors(
                loc.actualCount,
                traineesPerInstructor,
              );
              for (const schedule of unit.schedules as ScheduleRaw[]) {
                const assignmentsForLocation = (schedule.assignments || []).filter(
                  (a: AssignmentRaw) =>
                    a.trainingLocationId === loc.id || a.trainingLocationId === null,
                );

                const acceptedCount = assignmentsForLocation.filter(
                  (a: AssignmentRaw) => a.state === 'Accepted',
                ).length;

                const hasPending = assignmentsForLocation.some(
                  (a: AssignmentRaw) => a.state === 'Pending',
                );

                // 필요 인원보다 Accepted가 적거나, Pending이 있으면 미완료
                if (acceptedCount < requiredPerDay || hasPending) {
                  isUnitConfirmed = false;
                  break;
                }
              }
              if (!isUnitConfirmed) break;
            }
          }

          // 부대 상태 할당
          const unitStatus: 'Confirmed' | 'Temporary' = isUnitConfirmed ? 'Confirmed' : 'Temporary';

          return { ...unit, unitStatus, locations };
        })
        // 2단계: 부대 단위로 필터링
        .filter((unit) => {
          if (classificationFilter === 'all') return true;
          return unit.unitStatus === classificationFilter;
        })
        // 3단계: 데이터 변환
        .map((unit) => {
          let totalRequired = 0;
          let totalAssigned = 0;
          const assignedInstructorIds = new Set<number>();
          const locations = unit.locations;

          const trainingLocations = locations.map((loc: TrainingLocationRaw) => {
            const daysCount = unit.schedules.length;
            const requiredCount = calcRequiredInstructors(loc.actualCount, traineesPerInstructor);
            totalRequired += requiredCount * daysCount;

            // 2. 각 장소 안에서 '날짜별' 스케줄 구성
            const dates = unit.schedules.map((schedule: ScheduleRaw) => {
              const dateStr = toKSTDateString(schedule.date);

              // 해당 장소(loc.id)에 배정된 강사만 필터링 (부대 단위로 이미 필터링됨)
              const assignedInstructors = (schedule.assignments || [])
                .filter(
                  (a: AssignmentRaw) =>
                    // 활성 상태 (Pending 또는 Accepted)만 표시
                    (a.state === 'Pending' || a.state === 'Accepted') &&
                    (a.trainingLocationId === loc.id || a.trainingLocationId === null),
                )
                .map((assign: AssignmentRaw) => {
                  totalAssigned++;
                  assignedInstructorIds.add(assign.userId);
                  // 발송 여부: dispatchAssignments가 있으면 발송됨
                  const messageSent = (assign.dispatchAssignments?.length ?? 0) > 0;
                  return {
                    assignmentId: assign.unitScheduleId + '-' + assign.userId,
                    unitScheduleId: assign.unitScheduleId,
                    instructorId: assign.userId,
                    name: assign.User.name,
                    team: assign.User.instructor?.team?.name || '소속없음',
                    role: assign.role, // Head, Supervisor, or null
                    category: assign.User.instructor?.category || null, // Main, Co, Assistant, Practicum
                    trainingLocationId: assign.trainingLocationId,
                    state: assign.state, // Pending, Accepted, Rejected
                    messageSent, // 발송 여부 (DispatchAssignment 기반)
                  };
                });

              // 거절한 강사 목록
              const rejectedInstructors = (schedule.assignments || [])
                .filter(
                  (a: AssignmentRaw) =>
                    a.state === 'Rejected' &&
                    (a.trainingLocationId === loc.id || a.trainingLocationId === null),
                )
                .map((assign: AssignmentRaw) => ({
                  instructorId: assign.userId,
                  name: assign.User.name,
                  team: assign.User.instructor?.team?.name || '소속없음',
                  category: assign.User.instructor?.category || null,
                }));

              return {
                date: dateStr,
                unitScheduleId: schedule.id,
                isBlocked: schedule.isBlocked || false, // 배정 막기 상태
                requiredCount: calcRequiredInstructors(loc.actualCount, traineesPerInstructor),
                instructors: assignedInstructors,
                rejectedInstructors, // 거절한 강사 목록 추가
              };
            });

            return {
              id: loc.id,
              name: loc.originalPlace || '장소 미명',
              actualCount: loc.actualCount || 0,
              dates: dates,
            };
          });

          // 3. 부대 전체 요약 정보
          const startDate = unit.schedules[0] ? toKSTDateString(unit.schedules[0].date) : '-';
          const endDate = unit.schedules[unit.schedules.length - 1]
            ? toKSTDateString(unit.schedules[unit.schedules.length - 1].date)
            : '-';

          // 4. 확정 메시지 발송 여부 계산
          // - Confirmed 분류의 배정이 있고, 그 중 Confirmed 메시지를 받지 못한 강사가 없으면 완료
          let confirmedMessageSent = false;
          if (classificationFilter === 'Confirmed') {
            const allConfirmedAssignments = unit.schedules.flatMap((s: ScheduleRaw) =>
              (s.assignments || []).filter(
                (a: AssignmentRaw) => a.classification === 'Confirmed' && a.state === 'Accepted',
              ),
            );
            if (allConfirmedAssignments.length > 0) {
              // 모든 확정(수락된) 배정에 Confirmed 메시지가 있는지 확인
              confirmedMessageSent = allConfirmedAssignments.every((a: AssignmentRaw) => {
                const hasConfirmedMessage = (a.dispatchAssignments || []).some(
                  (da) => da.dispatch?.type === 'Confirmed',
                );
                return hasConfirmedMessage;
              });
            } else {
              // (수정) 확정 분류된 배정이 하나도 없다면?
              // 하지만 UnitStatus가 Confirmed이므로, 여기에 표시되는 부대입니다.
              // 이 경우 'Accepted' 상태인 배정들을 기준으로 판단하거나,
              // 혹은 아직 '확정 변환'이 안 된 상태라 보고 false로 두는 게 맞을 수도 있습니다.
              // 하지만 사용자는 "메시지 보냈는데 왜 안 떠?" 라고 하므로,
              // Accepted 상태인 배정들을 대상으로 한 번 더 확인해봅니다.
              const allAcceptedAssignments = unit.schedules.flatMap((s: ScheduleRaw) =>
                (s.assignments || []).filter((a: AssignmentRaw) => a.state === 'Accepted'),
              );

              if (allAcceptedAssignments.length > 0) {
                confirmedMessageSent = allAcceptedAssignments.every((a: AssignmentRaw) => {
                  return (a.dispatchAssignments || []).some(
                    (da) => da.dispatch?.type === 'Confirmed',
                  );
                });
              }
            }
          }

          // 5. 미발송 인원 수 계산 (유니크 강사 기준, messageSent === false)
          const unsentInstructorIds = new Set<number>();
          trainingLocations.forEach((loc) => {
            loc.dates.forEach(
              (d: { instructors: { instructorId: number; messageSent: boolean }[] }) => {
                d.instructors.forEach((i) => {
                  if (!i.messageSent) {
                    unsentInstructorIds.add(i.instructorId);
                  }
                });
              },
            );
          });
          const unsentCount = unsentInstructorIds.size;

          return {
            unitId: unit.id,
            unitName: unit.name,
            region: `${unit.wideArea} ${unit.region}`,
            period: `${startDate} ~ ${endDate}`,
            totalRequired,
            totalAssigned: assignedInstructorIds.size,
            progress:
              totalRequired > 0
                ? Math.round((assignedInstructorIds.size / totalRequired) * 100)
                : 0,
            trainingLocations: trainingLocations,
            confirmedMessageSent,
            unsentCount, // 미발송 인원 수
            isStaffLocked: (unit as any).isStaffLocked ?? false, // 인원고정 상태
          };
        })
        // 0명 배정된 부대는 필터링 (배정 작업 중/확정 섹션에서 표시 안 함)
        .filter((unit) => unit.totalAssigned > 0)
    );
  }
}

export default new AssignmentDTO();

// CommonJS 호환
module.exports = new AssignmentDTO();
