// src/domains/dispatch/dispatch.templateHelper.ts
// 발송 템플릿 변수 빌드 헬퍼

/**
 * 요일 문자열 반환
 */
export const getDayOfWeek = (date: Date): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
};

/**
 * 카테고리 한글 변환 (영어/한글 → 축약형 한글)
 */
export const categoryKorean: Record<string, string> = {
  Main: '주',
  Sub: '부',
  Co: '부',
  Assistant: '보조',
  Practicum: '실습',
  Trainee: '실습',
  주강사: '주',
  부강사: '부',
  보조강사: '보조',
  실습강사: '실습',
};

// === Types ===
interface UserData {
  name?: string | null;
  userphoneNumber?: string | null;
  instructor?: {
    category?: string | null;
    virtues?: Array<{ virtue?: { name?: string | null } }>;
  } | null;
}

interface UnitData {
  name?: string | null;
  region?: string | null;
  wideArea?: string | null;
  addressDetail?: string | null;
  detailAddress?: string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  educationStart?: Date | null;
  educationEnd?: Date | null;
  workStartTime?: Date | string | null;
  workEndTime?: Date | string | null;
  excludedDates?: string[];
  trainingLocations?: TrainingLocationData[];
  schedules?: ScheduleData[];
}

interface TrainingLocationData {
  originalPlace?: string | null;
  changedPlace?: string | null;
  actualCount?: number | null;
  hasInstructorLounge?: boolean | null;
  hasWomenRestroom?: boolean | null;
  hasCateredMeals?: boolean | null;
  hasHallLodging?: boolean | null;
  allowsPhoneBeforeAfter?: string | boolean | null;
  plannedCount?: number | null;
  note?: string | null;
}

interface ScheduleData {
  date: Date | null;
  assignments?: Array<{
    User?: {
      name?: string | null;
      instructor?: { category?: string | null };
    };
  }>;
}

interface AssignmentData {
  role?: string | null;
}

// === Variable Builders ===

/**
 * 단순 변수 빌드 (self.*, unit.*)
 */
export function buildVariables(
  user: UserData,
  unit: UnitData,
  assignments?: AssignmentData[],
): Record<string, string> {
  // 날짜 계산
  const unitStartDate = unit.schedules?.[0]?.date
    ? new Date(unit.schedules[0].date).toISOString().split('T')[0]
    : unit.educationStart
      ? new Date(unit.educationStart).toISOString().split('T')[0]
      : '';

  const lastScheduleDate = unit.schedules?.[unit.schedules.length - 1]?.date;
  const unitEndDate = lastScheduleDate
    ? new Date(lastScheduleDate).toISOString().split('T')[0]
    : unit.educationEnd
      ? new Date(unit.educationEnd).toISOString().split('T')[0]
      : '';

  // 시간 포맷팅
  const formatTime = (time: Date | string | null | undefined): string => {
    if (!time) return '';
    if (typeof time === 'string') return time;
    return new Date(time).toTimeString().slice(0, 5);
  };

  // 역할(position) 계산 (확정 배정용)
  let position = '';
  if (assignments?.length) {
    const hasRole = assignments.some((a) => a.role === 'Head' || a.role === 'Supervisor');
    if (hasRole) {
      const role = assignments.find((a) => a.role)?.role;
      position = role === 'Head' ? '총괄강사' : '책임강사';
    }
  }

  // 가능과목(virtues) 계산
  const virtues = (user.instructor?.virtues || [])
    .map((v) => v.virtue?.name || '')
    .filter(Boolean)
    .join(', ');

  // 첫 번째 교육장소 정보 (단수 변수용)
  const firstLocation = unit.trainingLocations?.[0];

  return {
    // Legacy 호환
    userName: user.name || '',
    unitName: unit.name || '',
    address: unit.addressDetail || '',
    region: unit.region || '',

    // self.* 본인 정보
    'self.name': user.name || '',
    'self.phone': user.userphoneNumber || '',
    'self.category':
      categoryKorean[user.instructor?.category || ''] || user.instructor?.category || '',
    'self.position': position,
    'self.virtues': virtues,

    // unit.* 부대 정보
    'unit.name': unit.name || '',
    'unit.region': unit.region || '',
    'unit.wideArea': unit.wideArea || '',
    'unit.addressDetail': unit.addressDetail || '',
    'unit.detailAddress': unit.detailAddress || '',
    'unit.officerName': unit.officerName || '',
    'unit.officerPhone': unit.officerPhone || '',
    'unit.startDate': unitStartDate,
    'unit.endDate': unitEndDate,
    'unit.startTime': formatTime(unit.workStartTime),
    'unit.endTime': formatTime(unit.workEndTime),
    'unit.excludedDates': (unit.excludedDates || []).join(' / '),

    // location.* 첫 번째 교육장소 정보 (단수형)
    'location.placeName': firstLocation?.originalPlace || '',
    'location.originalPlace': firstLocation?.originalPlace || '',
    'location.changedPlace': firstLocation?.changedPlace || '',
    'location.actualCount': String(firstLocation?.actualCount ?? 0),
    'location.plannedCount': String(firstLocation?.plannedCount ?? 0),
    'location.hasInstructorLounge': firstLocation?.hasInstructorLounge ? 'O' : 'X',
    'location.hasWomenRestroom': firstLocation?.hasWomenRestroom ? 'O' : 'X',
    'location.hasCateredMeals': firstLocation?.hasCateredMeals ? 'O' : 'X',
    'location.hasHallLodging': firstLocation?.hasHallLodging ? 'O' : 'X',
    'location.allowsPhoneBeforeAfter': firstLocation?.allowsPhoneBeforeAfter ? 'O' : 'X',
    'location.note': firstLocation?.note || '',
  };
}

/**
 * self.schedules 포맷 변수 빌드
 * 날짜별 일정 목록 (date, dayOfWeek, instructors)
 */
export function buildSchedulesFormat(schedules: ScheduleData[]): Array<Record<string, string>> {
  return schedules.map((schedule) => {
    const scheduleDate = schedule.date ? new Date(schedule.date) : new Date();
    const dateStr = scheduleDate.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(scheduleDate);

    const instructorNames = (schedule.assignments || [])
      .map((a) => {
        const name = a.User?.name || '';
        let category = a.User?.instructor?.category || '';
        category = categoryKorean[category] || category.replace('강사', '');
        return category ? `${name}(${category})` : name;
      })
      .filter(Boolean)
      .join(', ');

    return {
      date: dateStr,
      dayOfWeek,
      instructors: instructorNames || '-',
    };
  });
}

/**
 * locations 포맷 변수 빌드
 * 교육장소 목록 (index, placeName, actualCount, ...)
 */
export function buildLocationsFormat(
  locations: TrainingLocationData[],
): Array<Record<string, string>> {
  return locations.map((loc, idx) => ({
    index: String(idx + 1),
    placeName: String(loc.originalPlace ?? ''),
    changedPlace: String(loc.changedPlace ?? ''),
    actualCount: String(loc.actualCount ?? 0),
    hasInstructorLounge: loc.hasInstructorLounge ? 'O' : 'X',
    hasWomenRestroom: loc.hasWomenRestroom ? 'O' : 'X',
    hasCateredMeals: loc.hasCateredMeals ? 'O' : 'X',
    hasHallLodging: loc.hasHallLodging ? 'O' : 'X',
    allowsPhoneBeforeAfter: loc.allowsPhoneBeforeAfter ? 'O' : 'X',
    plannedCount: String(loc.plannedCount ?? 0),
    note: String(loc.note ?? ''),
  }));
}

// 강사 목록 데이터 타입
interface InstructorForFormat {
  name?: string | null;
  phone?: string | null;
  category?: string | null;
  virtues?: Array<{ virtue?: { name?: string | null } }>;
}

/**
 * instructors 포맷 변수 빌드
 * 강사 목록 (index, name, category, phone, virtues)
 */
export function buildInstructorsFormat(
  instructors: InstructorForFormat[],
): Array<Record<string, string>> {
  return instructors.map((inst, idx) => {
    // 카테고리 한글 변환
    let category = inst.category || '';
    category = categoryKorean[category] || category.replace('강사', '');

    // 가능과목
    const virtues = (inst.virtues || [])
      .map((v) => v.virtue?.name || '')
      .filter(Boolean)
      .join(', ');

    return {
      index: String(idx + 1),
      name: inst.name || '',
      category: category,
      phone: inst.phone || '',
      virtues: virtues || '-',
    };
  });
}

/**
 * self.mySchedules 포맷 변수 빌드
 * 날짜별 본인 일정 (date, dayOfWeek, name)
 */
export function buildMySchedulesFormat(
  schedules: Array<{ date: Date | string }>,
  userName: string,
): Array<Record<string, string>> {
  return schedules.map((schedule) => {
    const scheduleDate = new Date(schedule.date);
    const dateStr = scheduleDate.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(scheduleDate);

    return {
      date: dateStr,
      dayOfWeek: dayOfWeek,
      name: userName,
    };
  });
}

/**
 * 모든 포맷 변수 빌드
 */
export function buildFormatVariables(
  unit: UnitData,
): Record<string, Array<Record<string, string>>> {
  return {
    'self.schedules': buildSchedulesFormat(unit.schedules || []),
    locations: buildLocationsFormat(unit.trainingLocations || []),
  };
}
