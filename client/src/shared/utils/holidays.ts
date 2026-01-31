// shared/utils/holidays.ts
// 한국 공휴일 유틸리티 - @hyunbinseo/holidays-kr 라이브러리 사용
// 한국천문연구원(KASI) 공식 데이터 기반, 대체공휴일 포함

import {
  y2024,
  y2025,
  y2026,
  isHoliday as isHolidayLib,
  getHolidayNames,
} from '@hyunbinseo/holidays-kr';

// 연도별 공휴일 데이터
type HolidayData = Record<string, readonly string[]>;
const holidayDataByYear: Record<number, HolidayData> = {
  2024: y2024,
  2025: y2025,
  2026: y2026,
};

// 월별 공휴일 캐시 (year-month -> holidays map)
const holidayCache = new Map<string, Map<string, string>>();

/**
 * 특정 월의 공휴일 목록을 가져옵니다 (캐시됨)
 * @returns Map<dateString, holidayName>
 */
export const getHolidaysForMonth = (year: number, month: number): Map<string, string> => {
  const cacheKey = `${year}-${month}`;

  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }

  const monthHolidays = new Map<string, string>();
  const yearData = holidayDataByYear[year];

  if (yearData) {
    // 해당 연도의 모든 공휴일 순회
    for (const [dateStr, names] of Object.entries(yearData)) {
      const [, m] = dateStr.split('-').map(Number);
      if (m === month) {
        // 여러 이름이 있으면 첫 번째 사용
        monthHolidays.set(dateStr, names[0]);
      }
    }
  }

  holidayCache.set(cacheKey, monthHolidays);
  return monthHolidays;
};

/**
 * 특정 날짜가 공휴일인지 확인합니다
 */
export const isHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  // 라이브러리에 연도 데이터가 있으면 직접 사용
  if (holidayDataByYear[year]) {
    const holidays = getHolidaysForMonth(year, date.getMonth() + 1);
    return holidays.has(formatDate(date));
  }
  // 없으면 라이브러리 함수 사용 (Date 객체 필요)
  return isHolidayLib(date);
};

/**
 * 특정 날짜의 공휴일명을 반환합니다
 */
export const getHolidayName = (date: Date): string | undefined => {
  const year = date.getFullYear();
  if (holidayDataByYear[year]) {
    const holidays = getHolidaysForMonth(year, date.getMonth() + 1);
    return holidays.get(formatDate(date));
  }
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

/**
 * Date를 YYYY-MM-DD 형식으로 변환
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
