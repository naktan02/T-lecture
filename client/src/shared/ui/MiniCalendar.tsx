// client/src/shared/ui/MiniCalendar.tsx
import React, { useMemo, useState } from 'react';
import { BaseCalendar } from './BaseCalendar';

interface MiniCalendarProps {
  availableDates?: string[];
  className?: string;
  /**
   * 캘린더 너비
   * - 고정 크기: '240px', '300px' 등
   * - 반응형: '100%' (부모 div 꽉 채움)
   * - 최대 크기 제한: 'max-w-sm', 'max-w-md' 등 (Tailwind 클래스로 제어)
   */
  width?: string;
  year?: number;
  month?: number;
}

/**
 * 읽기 전용 미니 캘린더 (BaseCalendar 기반)
 * @param availableDates - ['2025-05-01', '2025-05-02'] 형태의 날짜 배열
 * @param className - 추가 스타일 클래스
 * @param width - 캘린더 너비 (기본: '100%' - 반응형)
 * @param year - 초기 표시 연도 (기본: 현재)
 * @param month - 초기 표시 월 (기본: 현재)
 */
export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  availableDates = [],
  className = '',
  width = '100%',
  year,
  month,
}) => {
  const today = new Date();

  // 월 전환을 위한 상태 관리
  const [displayYear, setDisplayYear] = useState(year ?? today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(month ?? today.getMonth() + 1);

  // 월 변경 핸들러
  const handleMonthChange = (newYear: number, newMonth: number) => {
    setDisplayYear(newYear);
    setDisplayMonth(newMonth);
  };

  // availableDates를 selectedDays(day 숫자 배열)로 변환
  // 현재 표시 중인 월의 날짜만 포함
  const selectedDays = useMemo(() => {
    return availableDates
      .map((dateStr) => {
        const date = new Date(dateStr);
        // 현재 표시 중인 월의 날짜만 포함
        if (date.getFullYear() === displayYear && date.getMonth() + 1 === displayMonth) {
          return date.getDate();
        }
        return null;
      })
      .filter((day): day is number => day !== null);
  }, [availableDates, displayYear, displayMonth]);

  return (
    <div
      className={`mini-calendar-wrapper bg-white rounded-lg shadow-xl border border-gray-200 p-2 ${className}`}
      style={{ width: width, maxWidth: '100%' }}
    >
      <style>{`
        /* MiniCalendar 전용 크기 조정 */
        .mini-calendar-wrapper .react-calendar__navigation {
          height: 30px;
          margin-bottom: 8px;
        }
        .mini-calendar-wrapper .react-calendar__navigation button {
          font-size: 13px;
          min-width: 24px;
        }
        .mini-calendar-wrapper .react-calendar__tile {
          padding: 4px 2px;
          font-size: 11px;
          height: 34px;
        }
        .mini-calendar-wrapper .react-calendar__month-view__weekdays {
          font-size: 10px;
        }
      `}</style>

      <BaseCalendar
        year={displayYear}
        month={displayMonth}
        selectedDays={selectedDays}
        onMonthChange={handleMonthChange}
        readOnly={true}
        showNeighboringMonth={false}
        size="small"
      />
    </div>
  );
};
