// client/src/shared/ui/MiniCalendar.tsx
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface MiniCalendarProps {
  availableDates?: string[];
  className?: string;
  width?: string;
}

interface TileArgs {
  date: Date;
  view: string;
}

/**
 * 읽기 전용 미니 캘린더
 * @param availableDates - ['2025-05-01', '2025-05-02'] 형태의 날짜 배열
 * @param className - 추가 스타일 클래스
 * @param width - 캘린더 너비 (예: '240px', '100%', '18rem')
 */
export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  availableDates = [],
  className = '',
  width = '240px',
}) => {
  return (
    <div
      className={`mini-calendar-wrapper bg-white rounded-lg shadow-xl border border-gray-200 p-2 ${className}`}
      style={{ width: width }}
    >
      <style>{`
                /* 캘린더 본체는 부모(wrapper) 너비를 가득 채우도록 설정 */
                .mini-calendar-wrapper .react-calendar { 
                    width: 100%; 
                    border: none; 
                    font-family: sans-serif;
                    background: transparent;
                }
                
                /* 상단 네비게이션 크기 조절 */
                .mini-calendar-wrapper .react-calendar__navigation {
                    height: 30px;
                    margin-bottom: 10px;
                }
                .mini-calendar-wrapper .react-calendar__navigation button {
                    font-size: 14px;
                    min-width: 24px;
                }

                /* 날짜 타일 크기 및 폰트 */
                .mini-calendar-wrapper .react-calendar__tile {
                    padding: 4px 2px;
                    font-size: 11px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* 선택된 날짜 (가능일) 하이라이트 */
                .highlight-date {
                    background: #3b82f6 !important;
                    color: white !important;
                    border-radius: 50%;
                    font-weight: bold;
                }

                /* 주말 색상 */
                .react-calendar__month-view__days__day--weekend {
                    color: #d10000;
                }
            `}</style>

      <Calendar
        view="month"
        tileClassName={({ date, view }: TileArgs): string | null => {
          if (view === 'month') {
            // 로컬 시간대 이슈 방지
            const offset = date.getTimezoneOffset() * 60000;
            const dateStr = new Date(date.getTime() - offset).toISOString().split('T')[0];

            if (availableDates.includes(dateStr)) {
              return 'highlight-date';
            }
          }
          return null;
        }}
        formatDay={(_locale: string | undefined, date: Date): string => date.getDate().toString()}
        minDetail="month"
        next2Label={null}
        prev2Label={null}
        showNeighboringMonth={false}
      />
    </div>
  );
};
