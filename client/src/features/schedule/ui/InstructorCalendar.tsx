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
    <div className="w-full h-full bg-gray-50 p-3 md:p-6 flex flex-col">
      {/* 전체 카드 컨테이너 */}
      <div className="w-full max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-1 lg:overflow-hidden">
        {/* 헤더 영역 - 모바일에서 더 압축 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 md:p-6 border-b border-gray-200 gap-2 flex-shrink-0">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">근무 일정 관리</h1>
            <p className="text-gray-500 mt-0.5 text-xs md:text-sm">
              근무 가능한 날짜를 선택해 주세요
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={refresh}
              disabled={fetching}
              className="bg-gray-500 hover:bg-gray-600 text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg font-semibold text-xs md:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="서버에서 최신 데이터 가져오기"
            >
              <svg
                className="w-3.5 h-3.5 md:w-4 md:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">{fetching ? '로딩...' : '새로고침'}</span>
            </button>

            <button
              onClick={saveSchedule}
              disabled={loading || fetching}
              className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold text-xs md:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장...' : '저장'}
            </button>
          </div>
        </div>

        {/* 컨텐츠 영역 - 모바일에서는 overflow 없이 페이지 스크롤, 데스크톱에서만 내부 스크롤 */}
        <div className="lg:flex-1 lg:overflow-auto p-3 md:p-6 space-y-3 md:space-y-4">
          {/* 월별 통계 패널 - 모바일에서 더 압축 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 md:p-3 border border-blue-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-white rounded-lg p-1.5 md:p-2.5 shadow-sm text-center min-w-[48px] md:min-w-[56px]">
                  <div className="text-lg md:text-2xl font-bold text-blue-600">
                    {selectedDays.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-500">선택</div>
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-base md:text-lg">📅</span>
                    <span className="font-semibold">
                      {year}년 {month}월
                    </span>
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-500 hidden sm:block">
                    근무 가능일을 선택하여 저장하세요
                  </div>
                </div>
              </div>
              <div className="hidden md:flex gap-2 text-center">
                <div className="bg-white/70 rounded-lg px-3 py-1.5">
                  <div className="text-base font-bold text-gray-700">
                    {new Date(year, month, 0).getDate()}
                  </div>
                  <div className="text-xs text-gray-500">총 일수</div>
                </div>
                <div className="bg-white/70 rounded-lg px-3 py-1.5">
                  <div className="text-base font-bold text-green-600">
                    {Math.round((selectedDays.length / new Date(year, month, 0).getDate()) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">가용률</div>
                </div>
              </div>
            </div>
          </div>

          {/* 범례 - 모바일에서 더 압축 */}
          <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 md:w-6 md:h-6 border-2 border-blue-500 rounded-full"></div>
              <span>선택됨</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-600 font-semibold">공휴일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-semibold">토</span>
              <span>토요일</span>
            </div>
          </div>

          {/* 캘린더 */}
          <div className="bg-gray-50 rounded-xl p-3 md:p-6 border border-gray-100">
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
    </div>
  );
};
