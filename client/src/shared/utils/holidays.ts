// shared/utils/holidays.ts
import Holidays from 'date-holidays';

// 한국 공휴일 인스턴스 (싱글톤)
const hd = new Holidays('KR');

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

  const holidays = hd.getHolidays(year);
  const monthHolidays = new Map<string, string>();

  holidays.forEach((holiday) => {
    const date = new Date(holiday.date);
    if (date.getMonth() + 1 === month && holiday.type === 'public') {
      const dateStr = formatDate(date);
      monthHolidays.set(dateStr, holiday.name);
    }
  });

  holidayCache.set(cacheKey, monthHolidays);
  return monthHolidays;
};

/**
 * 특정 날짜가 공휴일인지 확인합니다
 */
export const isHoliday = (date: Date): boolean => {
  const holidays = getHolidaysForMonth(date.getFullYear(), date.getMonth() + 1);
  return holidays.has(formatDate(date));
};

/**
 * 특정 날짜의 공휴일명을 반환합니다
 */
export const getHolidayName = (date: Date): string | undefined => {
  const holidays = getHolidaysForMonth(date.getFullYear(), date.getMonth() + 1);
  return holidays.get(formatDate(date));
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
