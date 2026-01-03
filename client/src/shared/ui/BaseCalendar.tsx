// shared/ui/BaseCalendar.tsx
// 캘린더 공통 로직과 스타일을 제공하는 베이스 컴포넌트

import React, { CSSProperties } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { isHoliday, isSaturday, isSunday, isSelectableDate, formatDay } from '../utils';

// 공통 인라인 스타일
const calendarStyles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
  },
};

interface CalendarTileArgs {
  date: Date;
  view: string;
}

export interface BaseCalendarProps {
  year: number;
  month: number;
  selectedDays: number[];
  onClickDay?: (date: Date) => void;
  onMonthChange?: (year: number, month: number) => void;
  readOnly?: boolean;
  showNeighboringMonth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const BaseCalendar: React.FC<BaseCalendarProps> = ({
  year,
  month,
  selectedDays,
  onClickDay,
  onMonthChange,
  readOnly = false,
  showNeighboringMonth = false,
  size = 'medium',
}) => {
  // 월 변경 핸들러
  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate && onMonthChange) {
      onMonthChange(activeStartDate.getFullYear(), activeStartDate.getMonth() + 1);
    }
  };

  // 날짜 클릭 핸들러
  const handleClickDay = (date: Date) => {
    if (readOnly) return;
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) return;
    if (!isSelectableDate(date)) return;
    onClickDay?.(date);
  };

  // 타일 클래스 결정
  const getTileClassName = ({ date, view }: CalendarTileArgs): string => {
    if (view !== 'month') return '';

    const classes: string[] = [];

    // 선택된 날짜
    if (date.getFullYear() === year && date.getMonth() + 1 === month) {
      if (selectedDays.includes(date.getDate())) {
        classes.push('base-calendar-selected');
      }
    }

    // 일요일 (공휴일보다 먼저 체크)
    if (isSunday(date)) {
      classes.push('base-calendar-sunday');
    }

    // 공휴일 (일요일이더라도 중복 적용)
    if (isHoliday(date)) {
      classes.push('base-calendar-holiday');
    }

    // 토요일
    if (isSaturday(date)) {
      classes.push('base-calendar-saturday');
    }

    // 비활성화
    if (!isSelectableDate(date)) {
      classes.push('base-calendar-disabled');
    }

    return classes.join(' ');
  };

  // 타일 비활성화 결정
  const getTileDisabled = ({ date, view }: CalendarTileArgs): boolean => {
    if (view !== 'month') return false;
    if (readOnly) return true;
    return !isSelectableDate(date);
  };

  // 사이즈에 따른 스타일
  const sizeStyles: Record<string, CSSProperties> = {
    small: { fontSize: '11px' },
    medium: { fontSize: '14px' },
    large: { fontSize: '16px' },
  };

  return (
    <>
      {/* 인라인 스타일 주입 */}
      <style>{`
        /* React Calendar 기본 스타일 오버라이드 */
        .react-calendar { 
          width: 100% !important; 
          border: none !important; 
          background: transparent !important; 
        }
        .react-calendar__tile { 
          position: relative !important; 
          aspect-ratio: 1 / 1 !important; /* 정사각형 유지 */
          min-height: 28px !important; /* ⚙️ 캘린더 크기 조절: 이 값을 변경하세요 (기본: 28px) */
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important; /* ⚙️ 날짜 숫자 크기 조절 (기본: 14px) */
        }
        .react-calendar__tile--active { background: transparent !important; }
        .react-calendar__tile:enabled:hover { background: #f3f4f6 !important; border-radius: 8px !important; }
        
        /* 오늘 날짜 - 연한 배경 + 회색 테두리 */
        .react-calendar__tile--now { 
          background: #dbeafe !important; /* 연한 파란색 배경 */
          border: 2px solid #93c5fd !important; /* 밝은 파란색 테두리 */
          border-radius: 8px !important;
          font-weight: 600 !important;
        }
        
        /* 오늘 + 선택됨 */
        .react-calendar__tile--now.base-calendar-selected {
          border: 2px solid #3b82f6 !important;
          border-radius: 50% !important;
        }
        
        /* 일요일 날짜 - 빨간색 */
        .react-calendar__tile.base-calendar-sunday { 
          color: #dc2626 !important; 
        }
        
        /* 공휴일 날짜 - 빨간색 */
        .react-calendar__tile.base-calendar-holiday { 
          color: #dc2626 !important; 
        }
        
        /* 토요일 날짜 - 파란색 */
        .react-calendar__tile.base-calendar-saturday { 
          color: #2563eb !important; 
        }
        
        /* 비활성화 */
        .react-calendar__tile.base-calendar-disabled { 
          cursor: not-allowed !important; 
          opacity: 0.6 !important; 
        }
        
        /* 선택된 날짜 - 가느다란 파란색 원형 테두리 */
        .react-calendar__tile.base-calendar-selected { 
          position: relative !important;
          border: 1.5px solid #3b82f6 !important; /* ⚙️ 테두리 두께 (기본: 1.5px) */
          border-radius: 50% !important;
          background: transparent !important;
        }
        
        /* 요일 헤더 색상 */
        .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { 
          color: #dc2626 !important; /* 일요일 */
        }
        .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { 
          color: #2563eb !important; /* 토요일 */
        }
      `}</style>

      <div style={{ ...calendarStyles.container, ...sizeStyles[size] }}>
        <Calendar
          onClickDay={handleClickDay}
          onActiveStartDateChange={handleActiveStartDateChange}
          tileClassName={getTileClassName}
          tileDisabled={getTileDisabled}
          next2Label={null}
          prev2Label={null}
          formatDay={(_, date) => formatDay(date)}
          calendarType="gregory"
          showNeighboringMonth={showNeighboringMonth}
          value={null} // 다중 선택을 위해 기본 선택 비활성화
        />
      </div>
    </>
  );
};
