// shared/types/calendar.types.ts

/**
 * react-calendar의 tileClassName/tileContent 콜백에서 사용되는 인자 타입
 */
export interface CalendarTileArgs {
  date: Date;
  view: string;
}

/**
 * 가용 일정 데이터 타입
 */
export interface AvailabilityDate {
  date: string; // 'YYYY-MM-DD' 형식
  isAvailable: boolean;
}
