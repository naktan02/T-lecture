import React, { useMemo, useState } from 'react';
import { BaseCalendar } from '../../../shared/ui/BaseCalendar';

interface AvailabilityCalendarProps {
  availableDates: string[]; // ['YYYY-MM-DD']
  onDateChange: (newDates: string[]) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  availableDates,
  onDateChange,
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // ISO string -> Date -> year/month filter -> day number array
  const selectedDays = useMemo(() => {
    return availableDates
      .map((dateStr) => new Date(dateStr))
      .filter((d) => d.getFullYear() === year && d.getMonth() + 1 === month)
      .map((d) => d.getDate());
  }, [availableDates, year, month]);

  const handleDateClick = (date: Date) => {
    // 로컬 시간 기준 YYYY-MM-DD 포맷팅
    const dateStr =
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0');

    if (availableDates.includes(dateStr)) {
      onDateChange(availableDates.filter((d) => d !== dateStr));
    } else {
      onDateChange([...availableDates, dateStr].sort());
    }
  };

  return (
    <div className="availability-calendar-wrapper bg-white rounded-lg border border-gray-200 p-2 w-full">
      <style>{`
        /* MiniCalendar 스타일 재사용 */
        .availability-calendar-wrapper .react-calendar__navigation {
          height: 30px;
          margin-bottom: 8px;
        }
        .availability-calendar-wrapper .react-calendar__navigation button {
          font-size: 13px;
          min-width: 24px;
        }
        .availability-calendar-wrapper .react-calendar__tile {
          padding: 4px 2px;
          font-size: 12px;
          height: 36px;
        }
        .availability-calendar-wrapper .react-calendar__month-view__weekdays {
          font-size: 11px;
        }
        /* 선택된 날짜 강조 (BaseCalendar 기본 스타일에 추가) */
        .availability-calendar-wrapper .base-calendar-selected {
          border-width: 2px !important;
          border-color: #2563eb !important; /* blue-600 */
        }
      `}</style>

      <BaseCalendar
        year={year}
        month={month}
        selectedDays={selectedDays}
        onClickDay={handleDateClick}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        readOnly={false}
        size="small"
        showNeighboringMonth={false}
      />

      <div className="mt-2 text-xs text-gray-500 text-center">
        선택된 날짜: <span className="font-bold text-blue-600">{availableDates.length}</span>일
      </div>
    </div>
  );
};
