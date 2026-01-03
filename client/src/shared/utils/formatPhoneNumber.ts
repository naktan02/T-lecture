/**
 * 숫자만 입력된 문자열을 전화번호 포맷(010-0000-0000)으로 변환합니다.
 * @param value 입력된 값
 * @returns 포맷팅된 전화번호 문자열
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return '';

  const numbers = value.replace(/[^\d]/g, '');

  // 02 등 지역번호 처리가 필요하다면 로직 추가 필요하지만,
  // 여기서는 휴대폰 번호(010) 기준으로 처리
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  if (numbers.length <= 11)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;

  // 11자리를 넘어가면 잘라냄
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};
