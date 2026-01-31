// shared/utils/holidays.ts
// 한국 공휴일 유틸리티 - @hyunbinseo/holidays-kr 라이브러리 사용
// 한국천문연구원(KASI) 공식 데이터 기반, 대체공휴일 포함

import { isHoliday as isHolidayLib, getHolidayNames } from '@hyunbinseo/holidays-kr';

// 월별 공휴일 캐시 (year-month -> holidays map)
// 동적으로 모든 연도를 캐싱 - 연도 explicit import 불필요
const holidayCache = new Map<string, Map<string, string>>();

/**
 * Date를 YYYY-MM-DD 형식으로 변환
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 특정 월의 공휴일 목록을 가져옵니다 (동적 캐싱)
 * @returns Map<dateString, holidayName>
 */
export const getHolidaysForMonth = (year: number, month: number): Map<string, string> => {
  const cacheKey = `${year}-${month}`;

  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }

  const monthHolidays = new Map<string, string>();

  // 해당 월의 모든 날짜를 순회하며 공휴일 체크
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const names = getHolidayNames(date);
    if (names && names.length > 0) {
      monthHolidays.set(formatDate(date), names[0]);
    }
  }

  holidayCache.set(cacheKey, monthHolidays);
  return monthHolidays;
};

/**
 * 특정 날짜가 공휴일인지 확인합니다
 */
export const isHoliday = (date: Date): boolean => {
  // 라이브러리 함수 직접 사용 (모든 연도 자동 지원)
  return isHolidayLib(date);
};

/**
 * 특정 날짜의 공휴일명을 반환합니다
 */
export const getHolidayName = (date: Date): string | undefined => {
  // 캐시에서 가져오거나 라이브러리 함수 사용
  const holidays = getHolidaysForMonth(date.getFullYear(), date.getMonth() + 1);
  const cached = holidays.get(formatDate(date));
  if (cached) return cached;
  // 라이브러리 함수 사용
  const names = getHolidayNames(date);
  return names && names.length > 0 ? names[0] : undefined;
};

/**
 * 토요일인지 확인합니다
 */
export const isSaturday = (date: Date): boolean => {
  return date.getDay() === 6;
};

/**
 * 일요일인지 확인합니다
 */
export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0;
};

/**
 * 선택 가능한 날짜인지 확인합니다 (평일이고 공휴일이 아닌 경우)
 */
export const isSelectableDate = (date: Date): boolean => {
  return !isSunday(date) && !isSaturday(date) && !isHoliday(date);
};
