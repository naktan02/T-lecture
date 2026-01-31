// src/common/utils/koreanHolidays.ts
// 한국 공휴일 유틸리티 - date-holidays 라이브러리 사용
// 음력 공휴일(설날, 추석, 부처님오신날), 대체공휴일 자동 계산

import Holidays from 'date-holidays';

// 한국 공휴일 인스턴스 (싱글톤)
const hd = new Holidays('KR');

/**
 * 특정 날짜가 한국 공휴일인지 확인
 * @param date Date 객체 또는 YYYY-MM-DD 문자열
 * @returns 공휴일이면 true
 */
export function isKoreanHoliday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const holiday = hd.isHoliday(d);

  // isHoliday는 공휴일이면 배열, 아니면 false 반환
  if (!holiday) return false;

  // 'public' 또는 'bank' 타입만 실제 공휴일로 처리
  // (observance는 기념일이지만 휴일이 아님)
  return holiday.some((h) => h.type === 'public' || h.type === 'bank');
}

/**
 * 특정 연도의 모든 공휴일을 YYYY-MM-DD 형식으로 반환
 * @param year 연도
 * @returns 공휴일 날짜 배열
 */
export function getHolidaysForYear(year: number): string[] {
  const holidays = hd.getHolidays(year);

  return holidays
    .filter((h) => h.type === 'public' || h.type === 'bank')
    .map((h) => {
      const d = new Date(h.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
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

  const holidays: Set<string> = new Set();

  // 시작 연도부터 종료 연도까지 공휴일 수집
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    for (const holiday of yearHolidays) {
      const holidayDate = new Date(holiday);
      if (holidayDate >= start && holidayDate <= end) {
        holidays.add(holiday);
      }
    }
  }

  return Array.from(holidays).sort();
}

/**
 * 공휴일 이름 조회
 * @param date Date 객체 또는 YYYY-MM-DD 문자열
 * @returns 공휴일 이름 또는 null
 */
export function getHolidayName(date: Date | string): string | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  const holiday = hd.isHoliday(d);

  if (!holiday) return null;

  const publicHoliday = holiday.find((h) => h.type === 'public' || h.type === 'bank');
  return publicHoliday ? publicHoliday.name : null;
}
