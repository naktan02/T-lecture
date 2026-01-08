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

/**
 * 군구분 한글 변환
 */
export const militaryTypeKorean: Record<string, string> = {
  Army: '육군',
  Navy: '해군',
  AirForce: '공군',
  Marines: '해병대',
  MND: '국직부대',
};

// === Types ===
// Prisma 반환 타입과 호환되도록 유연하게 정의 (추가 필드 허용)
interface UserData {
  name?: string | null;
  userphoneNumber?: string | null;
  instructor?: {
    category?: string | null;
    virtues?: Array<{ virtue?: { name?: string | null } }>;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface UnitData {
  name?: string | null;
  unitType?: string | null;
  region?: string | null;
  wideArea?: string | null;
  addressDetail?: string | null;
  detailAddress?: string | null;
  // 하위 호환용 (레거시)
  officerName?: string | null;
  officerPhone?: string | null;
  educationStart?: Date | null;
  educationEnd?: Date | null;
  workStartTime?: Date | string | null;
  workEndTime?: Date | string | null;
  excludedDates?: string[];
  trainingLocations?: TrainingLocationData[];
  schedules?: ScheduleData[];
  // 새 구조: TrainingPeriod 정보
  trainingPeriod?: TrainingPeriodData | null;
  // Prisma 추가 필드 허용
  [key: string]: unknown;
}

interface TrainingPeriodData {
  name?: string | null;
  workStartTime?: Date | string | null;
  workEndTime?: Date | string | null;
  lunchStartTime?: Date | string | null;
  lunchEndTime?: Date | string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;
  excludedDates?: string[];
  hasCateredMeals?: boolean | null;
  hasHallLodging?: boolean | null;
  allowsPhoneBeforeAfter?: boolean | null;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

interface ScheduleData {
  date: Date | null;
  scheduleLocations?: Array<{
    actualCount?: number | null;
    plannedCount?: number | null;
    location?: {
      originalPlace?: string | null;
      changedPlace?: string | null;
      hasInstructorLounge?: boolean | null;
      hasWomenRestroom?: boolean | null;
      note?: string | null;
    } | null;
  }>;
  // Prisma 반환 타입과 호환되도록 유연하게 정의
  assignments?: Array<{
    User?: {
      name?: string | null;
      instructor?: {
        category?: string | null;
        // Prisma에서 추가로 반환하는 필드들 허용
        [key: string]: unknown;
      } | null;
      // Prisma에서 추가로 반환하는 필드들 허용
      [key: string]: unknown;
    } | null;
    // 배정 자체의 추가 필드들 허용
    [key: string]: unknown;
  }>;
}

interface AssignmentData {
  role?: string | null;
}

// === Variable Builders ===

/**
 * 단순 변수 빌드 (self.*, unit.*, period.*, location.*)
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

  // TrainingPeriod 정보 (새 구조)
  const period = unit.trainingPeriod;

  // 담당관 정보 (period 우선, 없으면 unit 레거시)
  const officerName = period?.officerName ?? unit.officerName ?? '';
  const officerPhone = period?.officerPhone ?? unit.officerPhone ?? '';
  const officerEmail = period?.officerEmail ?? '';

  // 근무시간 (period 우선, 없으면 unit 레거시)
  const workStartTime = period?.workStartTime ?? unit.workStartTime;
  const workEndTime = period?.workEndTime ?? unit.workEndTime;

  // 교육불가일 (period 우선)
  const excludedDates = period?.excludedDates ?? unit.excludedDates ?? [];

  // 시설 정보 (period에서 가져옴, 없으면 location에서 레거시)
  const hasCateredMeals = period?.hasCateredMeals ?? firstLocation?.hasCateredMeals ?? false;
  const hasHallLodging = period?.hasHallLodging ?? firstLocation?.hasHallLodging ?? false;
  const allowsPhoneBeforeAfter =
    period?.allowsPhoneBeforeAfter ?? firstLocation?.allowsPhoneBeforeAfter ?? false;

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

    // unit.* 부대 정보 (Unit 테이블)
    'unit.name': unit.name || '',
    'unit.unitType': militaryTypeKorean[unit.unitType || ''] || unit.unitType || '',
    'unit.wideArea': unit.wideArea || '',
    'unit.region': unit.region || '',
    'unit.addressDetail': unit.addressDetail || '',
    'unit.detailAddress': unit.detailAddress || '',
    // 하위 호환: unit.* 레거시 변수들
    'unit.officerName': officerName,
    'unit.officerPhone': officerPhone,
    'unit.startDate': unitStartDate,
    'unit.endDate': unitEndDate,
    'unit.startTime': formatTime(workStartTime),
    'unit.endTime': formatTime(workEndTime),
    'unit.excludedDates': excludedDates.join(' / '),

    // period.* 교육기간 정보 (TrainingPeriod 테이블)
    'period.name': period?.name || '',
    'period.startDate': unitStartDate,
    'period.endDate': unitEndDate,
    'period.startTime': formatTime(workStartTime),
    'period.endTime': formatTime(workEndTime),
    'period.lunchStartTime': formatTime(period?.lunchStartTime),
    'period.lunchEndTime': formatTime(period?.lunchEndTime),
    'period.officerName': officerName,
    'period.officerPhone': officerPhone,
    'period.officerEmail': officerEmail,
    'period.excludedDates': excludedDates.join(' / '),
    'period.hasCateredMeals': hasCateredMeals ? 'O' : 'X',
    'period.hasHallLodging': hasHallLodging ? 'O' : 'X',
    'period.allowsPhoneBeforeAfter': allowsPhoneBeforeAfter ? '가능' : '불가',

    // location.* 첫 번째 교육장소 정보 (단수형)
    'location.placeName': firstLocation?.originalPlace || '',
    'location.originalPlace': firstLocation?.originalPlace || '',
    'location.changedPlace': firstLocation?.changedPlace || '',
    'location.actualCount': String(firstLocation?.actualCount ?? 0),
    'location.plannedCount': String(firstLocation?.plannedCount ?? 0),
    'location.hasInstructorLounge': firstLocation?.hasInstructorLounge ? 'O' : 'X',
    'location.hasWomenRestroom': firstLocation?.hasWomenRestroom ? 'O' : 'X',
    'location.note': firstLocation?.note || '',
    // 하위 호환: location.* 레거시 변수들
    'location.hasCateredMeals': hasCateredMeals ? 'O' : 'X',
    'location.hasHallLodging': hasHallLodging ? 'O' : 'X',
    'location.allowsPhoneBeforeAfter': allowsPhoneBeforeAfter ? '가능' : '불가',
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

/**
 * scheduleLocations 포맷 변수 빌드
 * 날짜별 장소 세부정보 (date, dayOfWeek, placeName, actualCount, ...)
 * 각 날짜의 각 장소별로 한 줄씩 출력
 */
export function buildScheduleLocationsFormat(
  schedules: ScheduleData[],
): Array<Record<string, string>> {
  const result: Array<Record<string, string>> = [];

  for (const schedule of schedules) {
    const scheduleDate = schedule.date ? new Date(schedule.date) : new Date();
    const dateStr = scheduleDate.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(scheduleDate);

    // 해당 날짜의 장소들을 각각 한 줄씩
    const scheduleLocations = schedule.scheduleLocations || [];
    if (scheduleLocations.length === 0) {
      result.push({
        date: dateStr,
        dayOfWeek,
        placeName: '-',
        actualCount: '0',
        hasInstructorLounge: 'X',
        hasWomenRestroom: 'X',
        note: '',
      });
    } else {
      for (const sl of scheduleLocations) {
        const loc = sl.location;
        result.push({
          date: dateStr,
          dayOfWeek,
          placeName: loc?.originalPlace || '-',
          actualCount: String(sl.actualCount ?? 0),
          plannedCount: String(sl.plannedCount ?? 0),
          hasInstructorLounge: loc?.hasInstructorLounge ? 'O' : 'X',
          hasWomenRestroom: loc?.hasWomenRestroom ? 'O' : 'X',
          note: loc?.note || '',
        });
      }
    }
  }

  return result;
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
    scheduleLocations: buildScheduleLocationsFormat(unit.schedules || []),
  };
}
