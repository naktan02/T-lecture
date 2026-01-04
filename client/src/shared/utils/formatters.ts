// shared/utils/formatters.ts
// 공통 포맷터 함수들

/**
 * Boolean 값을 한글 표시로 변환
 * @param val - boolean 또는 falsy/truthy 값
 * @returns 'O (가능/있음)' 또는 'X (불가/없음)'
 */
export const formatBool = (val: unknown): string => {
  return val ? 'O (가능/있음)' : 'X (불가/없음)';
};

/**
 * 시간 문자열 포맷팅
 * - ISO string (2025-01-01T09:00:00) → HH:MM
 * - 일반 시간 문자열은 그대로 반환
 * @param val - 시간 값
 * @returns 포맷된 시간 문자열 또는 '-'
 */
export const formatTimeDisplay = (val: unknown): string => {
  if (!val || typeof val !== 'string') return '-';
  if (val.includes('T')) {
    // ISO string인 경우
    return new Date(val).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return val;
};

/**
 * 날짜 문자열 포맷팅
 * - ISO string (2025-01-01T09:00:00) → YYYY-MM-DD
 * @param val - 날짜 값
 * @returns YYYY-MM-DD 형식 또는 '-'
 */
export const formatDateDisplay = (val: unknown): string => {
  if (!val || typeof val !== 'string') return '-';
  return val.split('T')[0];
};

/**
 * 숫자에 '명' 접미사 추가
 * @param val - 숫자 값
 * @returns '10명' 형식 또는 '-'
 */
export const formatCount = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  return `${val}명`;
};
