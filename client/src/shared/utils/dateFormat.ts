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
 * 'YYYY-MM-DD' 문자열을 Date 객체로 변환 (로컬 자정)
 */
export const parseStringToDate = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};

// ============ UTC Midnight Date Utilities ============

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
 * 이미 YYYY-MM-DD 형식이면 그대로 반환, 아니면 ISO 변환 후 날짜 부분 추출
 */
export const toDateOnlyString = (value?: string | null): string | null => {
  if (!value) return null;
  if (DATE_ONLY_RE.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

/**
 * UTC 자정 Date 객체 생성 (날짜 반복/비교용)
 * YYYY-MM-DD 형식의 문자열을 UTC 자정으로 파싱
 * 예: "2026-01-04" -> Date(2026-01-04T00:00:00.000Z)
 */
export const toUTCMidnight = (dateStr: string): Date => {
  if (DATE_ONLY_RE.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

/**
 * UTC 자정 기준으로 날짜 범위에서 날짜 문자열 배열 생성
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @param endDate - 종료일 (YYYY-MM-DD)
 * @param excludedDates - 제외할 날짜 배열 (YYYY-MM-DD[])
 * @returns YYYY-MM-DD 형식의 날짜 배열
 */
export const generateDateRange = (
  startDate: string,
  endDate: string,
  excludedDates: string[] = [],
): string[] => {
  const result: string[] = [];
  const excluded = new Set(excludedDates);

  const start = toUTCMidnight(startDate);
  const end = toUTCMidnight(endDate);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (!excluded.has(dateStr)) {
      result.push(dateStr);
    }
  }

  return result;
};
