// client/src/shared/types/unit.types.ts
// 부대 관련 타입 정의 (TrainingPeriod 기반 스키마)

// 군 구분
export type MilitaryType = 'Army' | 'Navy' | 'AirForce' | 'Marines' | 'MND';

// 일정-장소 연결
export interface ScheduleLocation {
  id?: number;
  unitScheduleId: number;
  trainingLocationId: number;
  plannedCount?: number | null;
  actualCount?: number | null;
  requiredCount?: number | null;
}

// 교육장소
export interface TrainingLocation {
  id?: number;
  trainingPeriodId: number;
  originalPlace?: string | null;
  changedPlace?: string | null;
  hasInstructorLounge?: boolean | null;
  hasWomenRestroom?: boolean | null;
  note?: string | null;
  scheduleLocations?: ScheduleLocation[];
}

// 부대 일정 (날짜)
export interface UnitSchedule {
  id?: number;
  trainingPeriodId: number;
  date?: string | null;
  scheduleLocations?: ScheduleLocation[];
  assignments?: { userId: number }[];
}

// 교육기간
export interface TrainingPeriod {
  id?: number;
  unitId: number;
  name: string; // "정규교육", "추가교육 1차" 등

  // 근무시간
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;

  // 담당관
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;

  // 설정
  isStaffLocked?: boolean;
  excludedDates?: string[];

  // 시설 정보
  hasCateredMeals?: boolean | null;
  hasHallLodging?: boolean | null;
  allowsPhoneBeforeAfter?: boolean | null;

  // 하위 관계
  locations?: TrainingLocation[];
  schedules?: UnitSchedule[];
}

// 부대 (기본 정보)
export interface Unit {
  id: number;
  lectureYear?: number;
  name: string;
  unitType?: MilitaryType | string | null;
  wideArea?: string | null;
  region?: string | null;
  addressDetail?: string | null;
  detailAddress?: string | null;
  lat?: number | null;
  lng?: number | null;

  // 교육기간 (핵심)
  trainingPeriods?: TrainingPeriod[];
}

// ===== Update Payloads =====

export interface TrainingLocationUpdatePayload {
  id?: number;
  originalPlace?: string;
  changedPlace?: string | null;
  hasInstructorLounge?: boolean;
  hasWomenRestroom?: boolean;
  note?: string | null;
}

export interface TrainingPeriodUpdatePayload {
  id?: number;
  name: string;
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;
  hasCateredMeals?: boolean;
  hasHallLodging?: boolean;
  allowsPhoneBeforeAfter?: boolean;
  locations?: TrainingLocationUpdatePayload[];
  schedules?: { date: string }[];
}

export interface UpdateUnitWithPeriodsPayload {
  name?: string;
  unitType?: MilitaryType | string;
  wideArea?: string;
  region?: string;
  detailAddress?: string;
  trainingPeriods: TrainingPeriodUpdatePayload[];
}

export interface CreateTrainingPeriodPayload {
  name: string;
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;
  hasCateredMeals?: boolean;
  hasHallLodging?: boolean;
  allowsPhoneBeforeAfter?: boolean;
  startDate?: string;
  endDate?: string;
  excludedDates?: string[];
}

// ============ Helper Functions ============

/**
 * 교육기간의 시작/종료 날짜 계산 (schedules에서 추출)
 */
export function getPeriodDateRange(period: TrainingPeriod): {
  start: string | null;
  end: string | null;
} {
  const dates = (period.schedules || [])
    .map((s) => s.date)
    .filter((d): d is string => !!d)
    .sort();

  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null,
  };
}

/**
 * 부대의 전체 교육기간 요약
 */
export function getUnitPeriodsSummary(unit: Unit): string[] {
  return (unit.trainingPeriods || []).map((p) => {
    const { start, end } = getPeriodDateRange(p);
    if (!start || !end) return `${p.name}: 미정`;
    const startStr = start.split('T')[0];
    const endStr = end.split('T')[0];
    return `${p.name}: ${startStr} ~ ${endStr}`;
  });
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toISOString().split('T')[0];
}

/**
 * 시간 포맷팅 (HH:MM)
 */
export function formatTimeShort(timeStr?: string | null): string {
  if (!timeStr) return '-';
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return '-';
  return d.toTimeString().slice(0, 5);
}

/**
 * Normalize a date string for <input type="date"> (YYYY-MM-DD).
 */
export function toDateInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
