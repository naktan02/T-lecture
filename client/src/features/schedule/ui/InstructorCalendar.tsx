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
    <div className="w-full h-full bg-gray-50 p-4 md:p-6 flex flex-col">
      {/* 전체 카드 컨테이너 - 공지사항과 동일한 스타일 */}
      <div className="w-full max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* 헤더 영역 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 md:p-6 border-b border-gray-200 gap-3 flex-shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">근무 일정 관리</h1>
            <p className="text-gray-500 mt-1 text-sm">
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

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
          {/* 월별 통계 패널 (압축) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-lg p-2.5 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{selectedDays.length}</div>
                  <div className="text-xs text-gray-500">선택한 날짜</div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">📅</span>
                    <span className="font-semibold">
                      {year}년 {month}월
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">근무 가능일을 선택하여 저장하세요</div>
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

          {/* 범례 */}
          <div className="flex flex-wrap gap-4 md:gap-6 text-sm text-gray-600">
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
          <div className="bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-100">
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
