import React, { useMemo, useState } from 'react';
import { useViewportHeightTier } from '../../../shared/hooks/useViewportHeightTier';
import { BaseCalendar } from '../../../shared/ui/BaseCalendar';

interface AvailabilityCalendarProps {
  availableDates: string[]; // ['YYYY-MM-DD']
  onDateChange: (newDates: string[], changedDate: string) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  availableDates,
  onDateChange,
}) => {
  const today = new Date();
  const { isCompactViewport, isShortViewport, isVeryShortViewport } = useViewportHeightTier();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const currentMonthKey = `${year}-${month.toString().padStart(2, '0')}`;

  // YYYY-MM-DD 문자열을 Date로 재해석하지 않고 그대로 월/일을 읽는다.
  const selectedDays = useMemo(() => {
    return availableDates
      .filter((dateStr) => dateStr.slice(0, 7) === currentMonthKey)
      .map((dateStr) => Number(dateStr.slice(8, 10)))
      .filter((day) => Number.isInteger(day));
  }, [availableDates, currentMonthKey]);

  const handleDateClick = (date: Date) => {
    // 로컬 시간 기준 YYYY-MM-DD 포맷팅
    const dateStr =
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0');

    if (availableDates.includes(dateStr)) {
      onDateChange(
        availableDates.filter((d) => d !== dateStr),
        dateStr,
      );
    } else {
      onDateChange([...availableDates, dateStr].sort(), dateStr);
    }
  };

  const wrapperPaddingClass = isVeryShortViewport
    ? 'p-1'
    : isShortViewport
      ? 'p-1.5'
      : isCompactViewport
        ? 'p-2'
        : 'p-2.5';
  const footerClass = isVeryShortViewport
    ? 'mt-1.5 text-[11px]'
    : isShortViewport
      ? 'mt-1.5 text-[11px]'
      : isCompactViewport
        ? 'mt-2 text-[11px] md:text-xs'
        : 'mt-2 text-xs';

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
