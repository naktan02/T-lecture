// shared/utils/dateFormat.ts

/**
 * Date 객체를 'YYYY-MM-DD' 형식 문자열로 변환 (timezone-safe)
 */
export const formatDateToString = (date: Date): string => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

/**
 * Date 객체에서 일(day)만 문자열로 반환
 */
export const formatDay = (date: Date): string => {
  return date.getDate().toString();
};

/**
 * 'YYYY-MM-DD' 문자열을 Date 객체로 변환
 */
export const parseStringToDate = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};
