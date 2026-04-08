// shared/ui/BaseCalendar.tsx
// 캘린더 공통 로직과 스타일을 제공하는 베이스 컴포넌트

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { isHoliday, isSaturday, isSunday, isSelectableDate, formatDay } from '../utils';

const calendarStyles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
  },
};

interface CalendarTileArgs {
  date: Date;
  view: string;
}

interface ElementSize {
  width: number;
  height: number;
}

const getElementSize = (element: HTMLElement | null): ElementSize => ({
  width: element?.offsetWidth ?? 0,
  height: element?.offsetHeight ?? 0,
});

const isSameSize = (left: ElementSize, right: ElementSize) =>
  left.width === right.width && left.height === right.height;

type CalendarCustomStyle = CSSProperties & Record<`--${string}`, string>;

export interface BaseCalendarProps {
  year: number;
  month: number;
  selectedDays: number[];
  onClickDay?: (date: Date) => void;
  onMonthChange?: (year: number, month: number) => void;
  readOnly?: boolean;
  showNeighboringMonth?: boolean;
  size?: 'small' | 'medium' | 'large';
  cutoffDate?: string | null; // 잠금 기준일 (YYYY-MM-DD, 이 날짜이전포함 수정 불가)
  fitHeight?: boolean;
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
  cutoffDate,
  fitHeight = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<ElementSize>({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState<ElementSize>({ width: 0, height: 0 });

  const cutoffUTC = cutoffDate ? new Date(cutoffDate + 'T00:00:00Z') : null;

  useEffect(() => {
    const containerElement = containerRef.current;
    const contentElement = contentRef.current;

    if (!containerElement || !contentElement) return;

    const updateContainerSize = () => {
      const nextSize = getElementSize(containerElement);
      setContainerSize((currentSize) =>
        isSameSize(currentSize, nextSize) ? currentSize : nextSize,
      );
    };

    const updateContentSize = () => {
      const nextSize = getElementSize(contentElement);
      setContentSize((currentSize) => (isSameSize(currentSize, nextSize) ? currentSize : nextSize));
    };

    updateContainerSize();
    updateContentSize();

    if (typeof ResizeObserver === 'undefined') return;

    const containerObserver = new ResizeObserver(() => {
      updateContainerSize();
      updateContentSize();
    });
    const contentObserver = new ResizeObserver(() => {
      updateContentSize();
    });

    containerObserver.observe(containerElement);
    contentObserver.observe(contentElement);

    return () => {
      containerObserver.disconnect();
      contentObserver.disconnect();
    };
  }, [year, month, fitHeight]);

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate && onMonthChange) {
      onMonthChange(activeStartDate.getFullYear(), activeStartDate.getMonth() + 1);
    }
  };

  const handleClickDay = (date: Date) => {
    if (readOnly) return;
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) return;
    if (!isSelectableDate(date)) return;
    onClickDay?.(date);
  };

  const getTileClassName = ({ date, view }: CalendarTileArgs): string => {
    if (view !== 'month') return '';

    const classes: string[] = [];

    if (date.getFullYear() === year && date.getMonth() + 1 === month) {
      if (selectedDays.includes(date.getDate())) {
        classes.push('base-calendar-selected');
      }
    }

    if (isSunday(date)) {
      classes.push('base-calendar-sunday');
    }

    if (isHoliday(date)) {
      classes.push('base-calendar-holiday');
    }

    if (isSaturday(date)) {
      classes.push('base-calendar-saturday');
    }

    if (!isSelectableDate(date)) {
      classes.push('base-calendar-disabled');
    }

    if (cutoffUTC) {
      const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      if (dateUTC <= cutoffUTC) {
        classes.push('base-calendar-locked');
      }
    }

    return classes.join(' ');
  };

  const getTileDisabled = ({ date, view }: CalendarTileArgs): boolean => {
    if (view !== 'month') return false;
    if (readOnly) return true;
    if (!isSelectableDate(date)) return true;
    if (cutoffUTC) {
      const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      if (dateUTC <= cutoffUTC) return true;
    }
    return false;
  };

  const sizeStyles: Record<string, CalendarCustomStyle> = {
    small: {
      '--base-calendar-font-size': '10px',
      '--base-calendar-nav-height': '30px',
      '--base-calendar-nav-min-width': '24px',
      '--base-calendar-nav-radius': '8px',
      '--base-calendar-nav-gap': '4px',
      '--base-calendar-nav-margin': '8px',
      '--base-calendar-weekday-margin': '2px',
      '--base-calendar-weekday-font-size': '0.72em',
      '--base-calendar-weekday-padding': '0.28rem',
      '--base-calendar-tile-min-height': '22px',
      '--base-calendar-tile-font-size': '11px',
    },
    medium: {
      '--base-calendar-font-size': '13px',
      '--base-calendar-nav-height': '38px',
      '--base-calendar-nav-min-width': '32px',
      '--base-calendar-nav-radius': '9px',
      '--base-calendar-nav-gap': '6px',
      '--base-calendar-nav-margin': '8px',
      '--base-calendar-weekday-margin': '3px',
      '--base-calendar-weekday-font-size': '0.75em',
      '--base-calendar-weekday-padding': '0.36rem',
      '--base-calendar-tile-min-height': '24px',
      '--base-calendar-tile-font-size': '12px',
    },
    large: {
      '--base-calendar-font-size': '15px',
      '--base-calendar-nav-height': '44px',
      '--base-calendar-nav-min-width': '40px',
      '--base-calendar-nav-radius': '10px',
      '--base-calendar-nav-gap': '6px',
      '--base-calendar-nav-margin': '10px',
      '--base-calendar-weekday-margin': '4px',
      '--base-calendar-weekday-font-size': '0.78em',
      '--base-calendar-weekday-padding': '0.45rem',
      '--base-calendar-tile-min-height': '26px',
      '--base-calendar-tile-font-size': '13px',
    },
  };

  const scale =
    fitHeight && containerSize.height > 0 && contentSize.height > 0
      ? Math.min(1, containerSize.height / contentSize.height)
      : 1;

  const frameStyle: CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 0,
  };

  if (fitHeight && contentSize.height > 0) {
    frameStyle.height = `${contentSize.height * scale}px`;
  }

  const contentStyle: CSSProperties = {
    width: fitHeight && containerSize.width > 0 ? `${containerSize.width}px` : '100%',
    maxWidth: '100%',
    margin: '0 auto',
  };

  if (fitHeight) {
    contentStyle.transform = `scale(${scale})`;
    contentStyle.transformOrigin = 'top center';
  }

  return (
    <>
      <style>{`
        .base-calendar-root.base-calendar-small {
          --base-calendar-font-size: 10px;
          --base-calendar-nav-height: 30px;
          --base-calendar-nav-min-width: 24px;
          --base-calendar-nav-radius: 8px;
          --base-calendar-nav-gap: 4px;
          --base-calendar-nav-margin: 8px;
          --base-calendar-weekday-margin: 2px;
          --base-calendar-weekday-font-size: 0.72em;
          --base-calendar-weekday-padding: 0.28rem;
          --base-calendar-tile-min-height: 22px;
          --base-calendar-tile-font-size: 11px;
        }
        .base-calendar-root.base-calendar-medium {
          --base-calendar-font-size: 13px;
          --base-calendar-nav-height: 38px;
          --base-calendar-nav-min-width: 32px;
          --base-calendar-nav-radius: 9px;
          --base-calendar-nav-gap: 6px;
          --base-calendar-nav-margin: 8px;
          --base-calendar-weekday-margin: 3px;
          --base-calendar-weekday-font-size: 0.75em;
          --base-calendar-weekday-padding: 0.36rem;
          --base-calendar-tile-min-height: 24px;
          --base-calendar-tile-font-size: 12px;
        }
        .base-calendar-root.base-calendar-large {
          --base-calendar-font-size: 15px;
          --base-calendar-nav-height: 44px;
          --base-calendar-nav-min-width: 40px;
          --base-calendar-nav-radius: 10px;
          --base-calendar-nav-gap: 6px;
          --base-calendar-nav-margin: 10px;
          --base-calendar-weekday-margin: 4px;
          --base-calendar-weekday-font-size: 0.78em;
          --base-calendar-weekday-padding: 0.45rem;
          --base-calendar-tile-min-height: 26px;
          --base-calendar-tile-font-size: 13px;
        }
        .base-calendar-root .react-calendar { 
          width: 100% !important; 
          border: none !important; 
          background: transparent !important; 
        }
        .base-calendar-root .react-calendar__navigation {
          display: flex !important;
          align-items: center !important;
          gap: var(--base-calendar-nav-gap) !important;
          height: var(--base-calendar-nav-height) !important;
          margin-bottom: var(--base-calendar-nav-margin) !important;
        }
        .base-calendar-root .react-calendar__navigation button {
          min-width: var(--base-calendar-nav-min-width) !important;
          border-radius: var(--base-calendar-nav-radius) !important;
          font-size: 1em !important;
          font-weight: 600 !important;
          color: #111827 !important;
        }
        .base-calendar-root .react-calendar__navigation button:enabled:hover,
        .base-calendar-root .react-calendar__navigation button:enabled:focus {
          background: #e5e7eb !important;
        }
        .base-calendar-root .react-calendar__navigation__label {
          font-weight: 700 !important;
        }
        .base-calendar-root .react-calendar__month-view__weekdays {
          margin-bottom: var(--base-calendar-weekday-margin) !important;
          font-size: var(--base-calendar-weekday-font-size) !important;
          font-weight: 700 !important;
          text-transform: none !important;
        }
        .base-calendar-root .react-calendar__month-view__weekdays__weekday {
          padding: var(--base-calendar-weekday-padding) 0 !important;
        }
        .base-calendar-root .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none !important;
        }
        .base-calendar-root .react-calendar__tile { 
          position: relative !important; 
          aspect-ratio: 1 / 1 !important;
          min-height: var(--base-calendar-tile-min-height) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: var(--base-calendar-tile-font-size) !important;
        }
        .base-calendar-root .react-calendar__tile--active { background: transparent !important; }
        .base-calendar-root .react-calendar__tile:enabled:hover { background: #f3f4f6 !important; border-radius: 8px !important; }
        .base-calendar-root .react-calendar__tile--now { 
          background: #dbeafe !important;
          border: 2px solid #93c5fd !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
        }
        .base-calendar-root .react-calendar__tile--now.base-calendar-selected {
          border: 2px solid #3b82f6 !important;
          border-radius: 50% !important;
        }
        .base-calendar-root .react-calendar__tile.base-calendar-sunday { 
          color: #dc2626 !important; 
        }
        .base-calendar-root .react-calendar__tile.base-calendar-holiday { 
          color: #dc2626 !important; 
        }
        .base-calendar-root .react-calendar__tile.base-calendar-saturday { 
          color: #2563eb !important; 
        }
        .base-calendar-root .react-calendar__tile.base-calendar-disabled { 
          cursor: not-allowed !important; 
          opacity: 0.6 !important; 
        }
        .base-calendar-root .react-calendar__tile.base-calendar-locked {
          cursor: not-allowed !important;
          background: #f3f4f6 !important;
          color: #9ca3af !important;
          opacity: 0.7 !important;
        }
        .base-calendar-root .react-calendar__tile.base-calendar-selected { 
          position: relative !important;
          border: 1.5px solid #3b82f6 !important;
          border-radius: 50% !important;
          background: transparent !important;
        }
        .base-calendar-root .react-calendar__month-view__weekdays__weekday:nth-child(1) abbr { 
          color: #dc2626 !important;
        }
        .base-calendar-root .react-calendar__month-view__weekdays__weekday:nth-child(7) abbr { 
          color: #2563eb !important;
        }
        @media (max-height: 980px) {
          .base-calendar-root.base-calendar-small {
            --base-calendar-nav-height: 28px;
            --base-calendar-nav-min-width: 22px;
            --base-calendar-nav-radius: 7px;
            --base-calendar-nav-gap: 3px;
            --base-calendar-nav-margin: 6px;
            --base-calendar-weekday-margin: 1px;
            --base-calendar-weekday-font-size: 0.68em;
            --base-calendar-weekday-padding: 0.22rem;
            --base-calendar-tile-min-height: 20px;
            --base-calendar-tile-font-size: 10px;
          }
          .base-calendar-root.base-calendar-medium {
            --base-calendar-nav-height: 34px;
            --base-calendar-nav-min-width: 28px;
            --base-calendar-nav-radius: 8px;
            --base-calendar-nav-gap: 5px;
            --base-calendar-nav-margin: 7px;
            --base-calendar-weekday-margin: 2px;
            --base-calendar-weekday-font-size: 0.71em;
            --base-calendar-weekday-padding: 0.28rem;
            --base-calendar-tile-min-height: 22px;
            --base-calendar-tile-font-size: 11px;
          }
          .base-calendar-root.base-calendar-large .react-calendar__navigation {
            height: 40px !important;
          }
          .base-calendar-root.base-calendar-large {
            --base-calendar-nav-height: 40px;
            --base-calendar-nav-min-width: 36px;
            --base-calendar-nav-radius: 9px;
            --base-calendar-nav-gap: 6px;
            --base-calendar-nav-margin: 8px;
            --base-calendar-weekday-margin: 2px;
            --base-calendar-weekday-font-size: 0.72em;
            --base-calendar-weekday-padding: 0.32rem;
            --base-calendar-tile-min-height: 24px;
            --base-calendar-tile-font-size: 12px;
          }
        }
        @media (max-height: 860px) {
          .base-calendar-root.base-calendar-small {
            --base-calendar-nav-height: 26px;
            --base-calendar-nav-min-width: 20px;
            --base-calendar-nav-radius: 6px;
            --base-calendar-nav-gap: 2px;
            --base-calendar-nav-margin: 5px;
            --base-calendar-weekday-margin: 1px;
            --base-calendar-weekday-font-size: 0.64em;
            --base-calendar-weekday-padding: 0.18rem;
            --base-calendar-tile-min-height: 18px;
            --base-calendar-tile-font-size: 9px;
          }
          .base-calendar-root.base-calendar-medium {
            --base-calendar-nav-height: 30px;
            --base-calendar-nav-min-width: 24px;
            --base-calendar-nav-radius: 7px;
            --base-calendar-nav-gap: 4px;
            --base-calendar-nav-margin: 6px;
            --base-calendar-weekday-margin: 1px;
            --base-calendar-weekday-font-size: 0.67em;
            --base-calendar-weekday-padding: 0.22rem;
            --base-calendar-tile-min-height: 20px;
            --base-calendar-tile-font-size: 10px;
          }
          .base-calendar-root.base-calendar-large {
            --base-calendar-nav-height: 36px;
            --base-calendar-nav-min-width: 32px;
            --base-calendar-nav-radius: 8px;
            --base-calendar-nav-gap: 5px;
            --base-calendar-nav-margin: 6px;
            --base-calendar-weekday-margin: 1px;
            --base-calendar-weekday-font-size: 0.68em;
            --base-calendar-weekday-padding: 0.24rem;
            --base-calendar-tile-min-height: 22px;
            --base-calendar-tile-font-size: 11px;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className={`base-calendar-root base-calendar-${size}`}
        style={{ ...calendarStyles.container, ...sizeStyles[size], overflow: 'hidden' }}
      >
        <div style={frameStyle}>
          <div ref={contentRef} style={contentStyle}>
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
              value={null}
            />
          </div>
        </div>
      </div>
    </>
  );
};
