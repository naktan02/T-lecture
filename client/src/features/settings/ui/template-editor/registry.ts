// settings/ui/template-editor/registry.ts

import type { VariableDef, VariableCategory } from './types';

export const variableCategories: VariableCategory[] = [
  { id: 'unit', label: '부대정보', icon: '🏛️', color: '#3b82f6' },
  { id: 'period', label: '교육기간', icon: '📅', color: '#f97316' },
  { id: 'location', label: '교육장소', icon: '📍', color: '#10b981' },
  { id: 'self', label: '본인정보', icon: '👤', color: '#8b5cf6' },
  { id: 'instructor', label: '강사목록', icon: '👥', color: '#ec4899' },
];

/**
 * 모든 플레이스홀더의 라벨과 아이콘을 여기서 통합 관리 (SSOT)
 */
export const PLACEHOLDER_META: Record<string, { label: string; icon: string }> = {
  index: { label: '순번', icon: '🔢' },
  name: { label: '이름', icon: '👤' },
  phone: { label: '전화번호', icon: '📱' },
  category: { label: '분류', icon: '🏷️' },
  virtues: { label: '가능과목', icon: '📚' },
  location: { label: '장소', icon: '📍' },
  date: { label: '날짜', icon: '📅' },
  dayOfWeek: { label: '요일', icon: '📆' },
  instructors: { label: '강사 목록', icon: '👥' },
  placeName: { label: '장소명', icon: '📍' },
  plannedCount: { label: '계획인원', icon: '👥' },
  actualCount: { label: '참여인원', icon: '👥' },
  hasInstructorLounge: { label: '강사휴게실', icon: '🛋️' },
  hasWomenRestroom: { label: '여자화장실', icon: '🚻' },
  allowsPhoneBeforeAfter: { label: '휴대폰불출', icon: '📱' },
  note: { label: '특이사항', icon: '📝' },
};

export const formatPlaceholders: Record<string, { key: string; label: string; icon: string }[]> = {
  // 교육장소 목록 - 날짜는 자동 표시, 오른쪽 장소 세부정보만 편집 가능
  scheduleLocations: [
    { key: 'placeName', ...PLACEHOLDER_META.placeName },
    { key: 'actualCount', ...PLACEHOLDER_META.actualCount },
    { key: 'hasInstructorLounge', ...PLACEHOLDER_META.hasInstructorLounge },
    { key: 'hasWomenRestroom', ...PLACEHOLDER_META.hasWomenRestroom },
    { key: 'note', ...PLACEHOLDER_META.note },
  ],
  instructors: [
    { key: 'index', ...PLACEHOLDER_META.index },
    { key: 'name', ...PLACEHOLDER_META.name },
    { key: 'phone', ...PLACEHOLDER_META.phone },
    { key: 'category', ...PLACEHOLDER_META.category },
    { key: 'virtues', ...PLACEHOLDER_META.virtues },
  ],
  'self.schedules': [
    { key: 'date', ...PLACEHOLDER_META.date },
    { key: 'dayOfWeek', ...PLACEHOLDER_META.dayOfWeek },
    { key: 'instructors', ...PLACEHOLDER_META.instructors },
  ],
  'self.mySchedules': [
    { key: 'date', ...PLACEHOLDER_META.date },
    { key: 'dayOfWeek', ...PLACEHOLDER_META.dayOfWeek },
    { key: 'name', ...PLACEHOLDER_META.name },
  ],
};

/**
 * 템플릿에서 사용할 수 있는 모든 변수 정의
 */
export const variableConfig: VariableDef[] = [
  // === 부대 정보 (Unit 테이블) ===
  { key: 'unit.name', label: '부대명', icon: '🏛️', category: 'unit' },
  { key: 'unit.unitType', label: '군구분', icon: '🎖️', category: 'unit' },
  { key: 'unit.wideArea', label: '광역', icon: '🗺️', category: 'unit' },
  { key: 'unit.region', label: '지역', icon: '📍', category: 'unit' },
  { key: 'unit.addressDetail', label: '주소', icon: '📍', category: 'unit' },
  { key: 'unit.detailAddress', label: '상세주소', icon: '🏠', category: 'unit' },

  // === 교육기간 정보 (TrainingPeriod 테이블) ===
  { key: 'period.name', label: '교육기간명', icon: '📋', category: 'period' },
  { key: 'period.startDate', label: '교육 시작일', icon: '📅', category: 'period' },
  { key: 'period.endDate', label: '교육 종료일', icon: '📅', category: 'period' },
  { key: 'period.startTime', label: '근무 시작시간', icon: '⏰', category: 'period' },
  { key: 'period.endTime', label: '근무 종료시간', icon: '⏰', category: 'period' },
  { key: 'period.lunchStartTime', label: '점심 시작시간', icon: '🍽️', category: 'period' },
  { key: 'period.lunchEndTime', label: '점심 종료시간', icon: '🍽️', category: 'period' },
  { key: 'period.officerName', label: '담당관 이름', icon: '👤', category: 'period' },
  { key: 'period.officerPhone', label: '담당관 전화', icon: '📞', category: 'period' },
  { key: 'period.officerEmail', label: '담당관 이메일', icon: '📧', category: 'period' },
  { key: 'period.excludedDates', label: '교육불가일', icon: '🚫', category: 'period' },
  { key: 'period.hasCateredMeals', label: '수탁급식', icon: '🍱', category: 'period' },
  { key: 'period.hasHallLodging', label: '회관숙박', icon: '🏨', category: 'period' },
  { key: 'period.allowsPhoneBeforeAfter', label: '휴대폰불출', icon: '📱', category: 'period' },

  // === 교육장소 정보 (날짜별 + 장소별 세부정보) ===
  {
    key: 'scheduleLocations',
    label: '날짜별 장소목록',
    icon: '📅',
    isFormat: true,
    category: 'location',
    defaultFormat:
      '{date} ({dayOfWeek}) - {placeName}: 참여 {actualCount}명, 강사휴게실: {hasInstructorLounge}, 여자화장실: {hasWomenRestroom}',
  },

  // === 본인 정보 ===
  { key: 'self.name', label: '본인 이름', icon: '👤', category: 'self' },
  { key: 'self.phone', label: '본인 전화', icon: '📱', category: 'self' },
  { key: 'self.category', label: '본인 직책', icon: '🏷️', category: 'self' },
  { key: 'self.position', label: '배정 직책', icon: '👔', category: 'self' },
  { key: 'self.virtues', label: '가능과목', icon: '📚', category: 'self' },
  {
    key: 'self.mySchedules',
    label: '날짜별 본인',
    icon: '📅',
    isFormat: true,
    category: 'self',
    defaultFormat: '- {date} ({dayOfWeek}) : {name}',
  },

  // === 강사 목록 (포맷) ===
  {
    key: 'self.schedules',
    label: '날짜별 일정',
    icon: '📅',
    isFormat: true,
    category: 'instructor',
  },
  { key: 'instructors', label: '강사 목록', icon: '👥', isFormat: true, category: 'instructor' },
];
