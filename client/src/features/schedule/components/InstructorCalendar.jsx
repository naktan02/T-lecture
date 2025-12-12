import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';

import 'react-calendar/dist/Calendar.css';

export const InstructorCalendar = () => {
  const [selectedDates, setSelectedDates] = useState([]);

  const handleDateClick = (value) => {
    const dateStr = format(value, 'yyyy-MM-dd');
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleSubmit = () => {
    alert(`[비즈니스 웹 캘린더]\n총 ${selectedDates.length}일의 일정이 선택되었습니다.`);
  };

  return (
    <div className="w-full flex justify-center bg-white p-8">
      
      <style>{`
        /* 1. 캘린더 전체 틀 */
        .react-calendar {
          width: 100%;
          max-width: 1000px;
          background: white;
          border: 1px solid #e5e7eb;
          font-family: 'Pretendard', -apple-system, sans-serif;
          line-height: 1.5;
        }

        /* 2. 상단 네비게이션 */
        .react-calendar__navigation {
          height: 60px;
          margin-bottom: 0;
          padding: 0 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }
        .react-calendar__navigation button:enabled:hover {
          background-color: #f3f4f6;
          border-radius: 8px;
        }

        /* 3. 요일 헤더 */
        .react-calendar__month-view__weekdays {
          background-color: #f9fafb;
          padding: 14px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .react-calendar__month-view__weekdays__weekday {
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: #6b7280;
          text-decoration: none;
        }
        abbr[title] { text-decoration: none; }

        /* 4. 날짜 셀 (기본 격자) */
        .react-calendar__tile {
          height: 110px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px;
          font-size: 1.05rem;
          font-weight: 500;
          color: #374151;
          background: white;
          border-right: 1px solid #f3f4f6;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.1s;
          
          /* ⭐ 중요: 내부 요소 위치 잡기 위해 */
          position: relative; 
          z-index: 0; 
          overflow: visible !important; /* 짤림 방지 */
        }
        
        /* 4-1. 날짜 숫자(Text)를 맨 위로 올리기 */
        .react-calendar__tile abbr {
          position: relative;
          z-index: 2; /* 파란 상자보다 위에 오게 함 */
        }
        
        .react-calendar__tile:enabled:hover {
          background-color: #f8fafc;
        }

        /* 이웃한 달 숨김 */
        .react-calendar__month-view__days__day--neighboringMonth {
          background-color: #fcfcfc !important;
          color: transparent !important;
          pointer-events: none !important;
        }

        /* 오늘 날짜 */
        .react-calendar__tile--now {
          color: #2563eb !important;
        }
        .react-calendar__tile--now:not(.selected-date)::after {
          content: 'TODAY';
          font-size: 0.65rem;
          font-weight: 700;
          background-color: #eff6ff;
          color: #2563eb;
          padding: 3px 6px;
          border-radius: 4px;
          margin-top: 6px;
        }

        /* ✅ [수정 완료] 선택된 날짜 (둥근 네모) */
        .selected-date {
          background: transparent !important; /* 타일 자체 배경은 투명 */
          color: #1e40af !important;
          font-weight: 700;
        }

        /* ⭐ 둥근 파란 상자를 그리는 가상 요소 */
        .selected-date::before {
          content: '';
          position: absolute;
          /* 상하좌우 6px씩 띄워서 안쪽으로 쏙 들어오게 함 */
          top: 6px; left: 6px; right: 6px; bottom: 6px;
          
          background-color: #eff6ff; /* 연한 블루 */
          border: 2px solid #3b82f6; /* 진한 블루 테두리 */
          border-radius: 16px; /* ⭐ 둥근 모서리 (더 둥글게) */
          
          z-index: 1; /* 글자(abbr:2)보다는 아래, 타일바닥(0)보다는 위 */
          box-shadow: 0 4px 6px -2px rgba(59, 130, 246, 0.2);
        }

        /* 체크 표시 */
        .selected-date::after {
          content: '✔';
          position: absolute;
          bottom: 12px;
          right: 12px;
          font-size: 1.1rem;
          color: #2563eb;
          z-index: 2;
        }

        /* ✅ 주말 색상 (토/일 구분) */
        /* 일요일: 타일 자체 배경색 변경 */
        .react-calendar__month-view__days__day--weekend {
          color: #ef4444; 
          background-color: #fff1f2; 
        }
        /* 토요일 */
        .react-calendar__month-view__days__day--weekend:not(:nth-child(7n)) {
          color: #2563eb; 
          background-color: #f0f9ff; 
        }
        
        /* 선택된 날짜가 주말일 때 배경 겹침 해결 */
        .selected-date.react-calendar__month-view__days__day--weekend {
           background-color: transparent !important; /* 파란 상자가 보여야 하므로 투명 */
        }
      `}</style>

      <div className="w-full max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b border-gray-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-700 py-1 px-2 rounded text-xs font-bold">BUSINESS</span>
              <h1 className="text-3xl font-bold text-gray-900">근무 일정 관리</h1>
            </div>
            <p className="text-gray-500 mt-1">
              날짜를 클릭하여 근무 일정을 등록하세요.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block mr-2">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wide">Selected Days</span>
              <div className="font-bold text-2xl text-blue-600 leading-none">
                {selectedDates.length}<span className="text-sm text-gray-400 ml-1 font-medium">days</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>저장하기</span>
            </button>
          </div>
        </div>

        <div className="shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <Calendar 
            onClickDay={handleDateClick}
            tileClassName={({ date }) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              if (selectedDates.includes(dateStr)) return 'selected-date';
            }}
            next2Label={null}
            prev2Label={null}
            formatDay={(locale, date) => format(date, 'd')}
            calendarType="gregory"
            showNeighboringMonth={true}
          />
        </div>
        
        <div className="flex gap-8 mt-6 text-sm text-gray-500 justify-end border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white border border-gray-200 rounded shadow-sm"></div>
            <span>평일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-fff1f2 border border-red-200 rounded shadow-sm"></div>
            <span className="text-red-400">일요일</span>
          </div>
           <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-f0f9ff border border-blue-200 rounded shadow-sm"></div>
            <span className="text-blue-400">토요일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-eff6ff border-2 border-blue-500 rounded-lg shadow-sm relative">
                <span className="absolute bottom-0 right-0.5 text-blue-600 text-[10px]">✔</span>
            </div>
            <span className="font-bold text-blue-700">선택됨</span>
          </div>
        </div>

      </div>
    </div>
  );
};