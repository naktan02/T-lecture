import React, { useMemo, useState } from 'react';
import { useViewportHeightTier } from '../../../shared/hooks/useViewportHeightTier';
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
  const { isShortViewport, isVeryShortViewport } = useViewportHeightTier();
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

  const wrapperPaddingClass = isVeryShortViewport ? 'p-1.5' : isShortViewport ? 'p-2' : 'p-2';
  const footerClass = isVeryShortViewport ? 'mt-1.5 text-[11px]' : 'mt-2 text-xs';

  return (
    <div
      className={`availability-calendar-wrapper bg-white rounded-lg border border-gray-200 w-full ${wrapperPaddingClass}`}
    >
      <style>{`
        .availability-calendar-wrapper .base-calendar-selected {
          border-width: 2px !important;
          border-color: #2563eb !important;
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

      <div className={`${footerClass} text-gray-500 text-center`}>
        선택된 날짜: <span className="font-bold text-blue-600">{availableDates.length}</span>일
      </div>
    </div>
  );
};
