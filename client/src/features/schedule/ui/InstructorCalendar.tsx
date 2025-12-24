// src/features/schedule/ui/InstructorCalendar.tsx
import React, { useState } from 'react';
import { BaseCalendar } from '../../../shared/ui';
import { useSchedule } from '../model/useSchedule';

export const InstructorCalendar: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { selectedDays, toggleDay, saveSchedule, refresh, loading, fetching } = useSchedule(
    year,
    month,
  );

  // 월 변경 핸들러
  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  // 날짜 클릭 핸들러
  const handleClickDay = (date: Date) => {
    toggleDay(date.getDate());
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ⚙️ 캘린더 전체 너비 조절: max-w-5xl을 변경하세요 (5xl=1024px, 4xl=896px, 6xl=1152px) */}
      <div className="w-full max-w-5xl mx-auto">
        {/* 헤더 영역 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">근무 일정 관리</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              근무 가능한 날짜를 선택해 주세요. (공휴일/주말 제외)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={refresh}
              disabled={fetching}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="서버에서 최신 데이터 가져오기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">{fetching ? '로딩 중...' : '새로고침'}</span>
            </button>

            <button
              onClick={saveSchedule}
              disabled={loading || fetching}
              className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 월별 통계 패널 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{selectedDays.length}</div>
                <div className="text-xs text-gray-500 mt-1">선택한 날짜</div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📅</span>
                  <span className="font-semibold">
                    {year}년 {month}월
                  </span>
                </div>
                <div className="text-xs text-gray-500">근무 가능일을 선택하여 저장하세요</div>
              </div>
            </div>
            <div className="hidden md:flex gap-3 text-center">
              <div className="bg-white/70 rounded-lg px-4 py-2">
                <div className="text-lg font-bold text-gray-700">
                  {new Date(year, month, 0).getDate()}
                </div>
                <div className="text-xs text-gray-500">이번 달 총 일수</div>
              </div>
              <div className="bg-white/70 rounded-lg px-4 py-2">
                <div className="text-lg font-bold text-green-600">
                  {Math.round((selectedDays.length / new Date(year, month, 0).getDate()) * 100)}%
                </div>
                <div className="text-xs text-gray-500">가용률</div>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-4 md:gap-6 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 rounded-full"></div>
            <span>선택된 날짜</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold">공휴일</span>
            <span>공휴일/일요일</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-semibold">토</span>
            <span>토요일</span>
          </div>
        </div>

        {/* 캘린더 */}
        <div className="bg-white shadow-lg rounded-2xl p-4 md:p-6 border border-gray-100">
          <BaseCalendar
            year={year}
            month={month}
            selectedDays={selectedDays}
            onClickDay={handleClickDay}
            onMonthChange={handleMonthChange}
            size="large"
          />
        </div>
      </div>
    </div>
  );
};
