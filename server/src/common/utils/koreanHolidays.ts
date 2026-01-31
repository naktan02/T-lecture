// src/common/utils/koreanHolidays.ts
// 한국 공휴일 유틸리티 - @hyunbinseo/holidays-kr 라이브러리 사용
// 한국 천문연구원 공식 데이터 기반 (설날/추석 전날, 대체공휴일 포함)

import { isHoliday as checkHoliday, getHolidayNames } from '@hyunbinseo/holidays-kr';

// 월별 공휴일 캐시 (year-month -> holidays map)
// 동적으로 모든 연도를 캐싱 - 연도 explicit import 불필요
const holidayCache = new Map<string, string[]>();

/**
 * 특정 날짜가 한국 공휴일인지 확인
 * @param date Date 객체 또는 YYYY-MM-DD 문자열
 * @returns 공휴일이면 true
 */
export function isKoreanHoliday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return checkHoliday(d);
}

/**
 * 특정 연도의 모든 공휴일을 YYYY-MM-DD 형식으로 반환
 * @param year 연도
 * @returns 공휴일 날짜 배열
 */
export function getHolidaysForYear(year: number): string[] {
  const cacheKey = `year-${year}`;
  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }

  const holidays: string[] = [];

  // 1년의 모든 날짜를 순회하며 공휴일 체크
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (checkHoliday(date)) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        holidays.push(dateStr);
      }
    }
  }

  holidayCache.set(cacheKey, holidays);
  return holidays;
}

/**
 * 날짜 범위 내의 모든 공휴일을 반환
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns YYYY-MM-DD 형식의 공휴일 배열
 */
export function getHolidaysInRange(startDate: Date | string, endDate: Date | string): string[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const holidays: string[] = [];

  // 시작 연도부터 종료 연도까지 공휴일 수집
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    for (const holiday of yearHolidays) {
      const holidayDate = new Date(holiday);
      if (holidayDate >= start && holidayDate <= end) {
        holidays.push(holiday);
      }
    }
  }

  return holidays.sort();
}

/**
 * 공휴일 이름 조회
 * @param date Date 객체 또는 YYYY-MM-DD 문자열
 * @returns 공휴일 이름 배열 또는 null
 */
export function getHolidayName(date: Date | string): readonly string[] | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  const names = getHolidayNames(d);
  return names && names.length > 0 ? names : null;
}
