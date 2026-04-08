// src/features/schedule/ui/InstructorCalendar.tsx
import React, { useState } from 'react';
import { useViewportHeightTier } from '../../../shared/hooks/useViewportHeightTier';
import { BaseCalendar } from '../../../shared/ui';
import { useSchedule } from '../model/useSchedule';

export const InstructorCalendar: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { isShortViewport, isVeryShortViewport } = useViewportHeightTier();

  const { selectedDays, toggleDay, saveSchedule, refresh, loading, fetching, cutoffDate } =
    useSchedule(year, month);

  const shouldUseScrollLayout = isVeryShortViewport;
  const rootLayoutClass = shouldUseScrollLayout ? 'min-h-full' : 'flex-1 min-h-0';
  const shellPaddingClass = shouldUseScrollLayout
    ? 'p-2 sm:p-3'
    : isShortViewport
      ? 'p-2 md:p-3 lg:p-4'
      : 'p-2 md:p-4 lg:p-6';
  const cardLayoutClass = shouldUseScrollLayout ? '' : 'flex-1 min-h-0';
  const cardOverflowClass = shouldUseScrollLayout ? '' : 'overflow-hidden';
  const contentLayoutClass = shouldUseScrollLayout ? '' : 'flex-1 min-h-0 overflow-hidden';
  const headerPaddingClass = isVeryShortViewport
    ? 'p-2.5'
    : isShortViewport
      ? 'p-3 md:p-4'
      : 'p-3 md:p-5';
  const titleClass = isVeryShortViewport
    ? 'text-base sm:text-lg md:text-xl'
    : isShortViewport
      ? 'text-lg md:text-xl'
      : 'text-lg md:text-2xl';
  const subtitleClass = isVeryShortViewport
    ? 'mt-0 text-[10px] md:text-xs'
    : isShortViewport
      ? 'mt-0 text-[11px] md:text-xs'
      : 'mt-0.5 text-xs md:text-sm';
  const panelPaddingClass = isVeryShortViewport
    ? 'p-2'
    : isShortViewport
      ? 'p-2.5 md:p-3'
      : 'p-2 md:p-3';
  const countCardClass = isVeryShortViewport
    ? 'min-w-[44px] p-1.5'
    : isShortViewport
      ? 'min-w-[48px] p-2'
      : 'min-w-[48px] md:min-w-[56px] p-1.5 md:p-2.5';
  const calendarPanelClass = shouldUseScrollLayout
    ? 'min-h-[32rem] overflow-x-auto overflow-y-visible p-2 sm:p-3'
    : isShortViewport
      ? 'flex-1 min-h-0 overflow-hidden p-2 md:p-3'
      : 'flex-1 min-h-0 overflow-hidden p-2 md:p-4';

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleClickDay = (date: Date) => {
    toggleDay(date.getDate());
  };

  return (
    <div className={`w-full bg-gray-50 flex flex-col ${rootLayoutClass} ${shellPaddingClass}`}>
      <div
        className={`w-full max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col ${cardLayoutClass} ${cardOverflowClass}`}
      >
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center ${headerPaddingClass} border-b border-gray-200 gap-2 flex-shrink-0`}
        >
          <div>
            <h1 className={`${titleClass} font-bold text-gray-900`}>근무 일정 관리</h1>
            <p className={`text-gray-500 ${subtitleClass}`}>근무 가능한 날짜를 선택해 주세요</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              onClick={refresh}
              disabled={fetching}
              className={`bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap ${
                isVeryShortViewport
                  ? 'px-2 py-1.5 text-[11px]'
                  : isShortViewport
                    ? 'px-2.5 py-1.5 text-xs'
                    : 'px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm'
              }`}
              title="서버에서 최신 데이터 가져오기"
            >
              <svg
                className={`${isVeryShortViewport ? 'w-3 h-3' : 'w-3.5 h-3.5 md:w-4 md:h-4'}`}
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
              className={`bg-gray-900 hover:bg-black text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                isVeryShortViewport
                  ? 'px-2.5 py-1.5 text-[11px]'
                  : isShortViewport
                    ? 'px-3 py-1.5 text-xs'
                    : 'px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm'
              }`}
            >
              {loading ? '저장...' : '저장'}
            </button>
          </div>
        </div>

        <div
          className={`p-3 md:p-5 flex flex-col ${contentLayoutClass} ${
            isVeryShortViewport ? 'gap-2.5' : 'gap-3 md:gap-4'
          }`}
        >
          <div
            className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex-shrink-0 ${panelPaddingClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className={`bg-white rounded-lg shadow-sm text-center ${countCardClass}`}>
                  <div
                    className={`font-bold text-blue-600 ${
                      isVeryShortViewport
                        ? 'text-base'
                        : isShortViewport
                          ? 'text-lg'
                          : 'text-lg md:text-2xl'
                    }`}
                  >
                    {selectedDays.length}
                  </div>
                  <div
                    className={`text-gray-500 ${
                      isVeryShortViewport ? 'text-[9px]' : 'text-[10px] md:text-xs'
                    }`}
                  >
                    선택
                  </div>
                </div>
                <div className="min-w-0 text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className={isVeryShortViewport ? 'text-sm' : 'text-base md:text-lg'}>
                      📅
                    </span>
                    <span
                      className={`font-semibold ${
                        isVeryShortViewport
                          ? 'text-xs sm:text-sm'
                          : isShortViewport
                            ? 'text-sm md:text-base'
                            : 'text-xs md:text-sm'
                      }`}
                    >
                      {year}년 {month}월
                    </span>
                  </div>
                  <div
                    className={`text-gray-500 ${
                      isVeryShortViewport
                        ? 'hidden'
                        : isShortViewport
                          ? 'hidden sm:block text-[10px]'
                          : 'hidden sm:block text-[10px] md:text-xs'
                    }`}
                  >
                    근무 가능일을 선택하여 저장하세요
                  </div>
                </div>
              </div>
              <div className="hidden md:flex gap-2 text-center">
                <div
                  className={`bg-white/70 rounded-lg ${
                    isShortViewport ? 'px-2.5 py-1.5' : 'px-3 py-1.5'
                  }`}
                >
                  <div
                    className={`font-bold text-gray-700 ${isShortViewport ? 'text-sm' : 'text-base'}`}
                  >
                    {new Date(year, month, 0).getDate()}
                  </div>
                  <div
                    className={
                      isShortViewport ? 'text-[10px] text-gray-500' : 'text-xs text-gray-500'
                    }
                  >
                    총 일수
                  </div>
                </div>
                <div
                  className={`bg-white/70 rounded-lg ${
                    isShortViewport ? 'px-2.5 py-1.5' : 'px-3 py-1.5'
                  }`}
                >
                  <div
                    className={`font-bold text-green-600 ${isShortViewport ? 'text-sm' : 'text-base'}`}
                  >
                    {Math.round((selectedDays.length / new Date(year, month, 0).getDate()) * 100)}%
                  </div>
                  <div
                    className={
                      isShortViewport ? 'text-[10px] text-gray-500' : 'text-xs text-gray-500'
                    }
                  >
                    가용률
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-wrap text-gray-600 flex-shrink-0 ${
              isVeryShortViewport
                ? 'gap-x-3 gap-y-2 text-[11px]'
                : 'gap-3 md:gap-6 text-xs md:text-sm'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div
                className={`border-2 border-blue-500 rounded-full ${
                  isVeryShortViewport ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-6 md:h-6'
                }`}
              ></div>
              <span>선택됨</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`rounded bg-gray-200 ${
                  isVeryShortViewport ? 'w-3.5 h-3.5' : 'w-4 h-4 md:w-6 md:h-6'
                }`}
              ></div>
              <span className="text-gray-400">수정 불가</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-600 font-semibold">공휴일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-600 font-semibold">토</span>
              <span>토요일</span>
            </div>
          </div>

          {cutoffDate && (
            <div
              className={`flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 flex-shrink-0 ${
                isVeryShortViewport ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
              }`}
            >
              <span>🔒</span>
              <span>
                관리자가 <strong>{cutoffDate}</strong> 이전 날짜를 수정 불가로 설정했습니다.
              </span>
            </div>
          )}

          <div
            className={`bg-gray-50 rounded-xl border border-gray-100 flex items-start justify-center ${calendarPanelClass}`}
          >
            <BaseCalendar
              year={year}
              month={month}
              selectedDays={selectedDays}
              onClickDay={handleClickDay}
              onMonthChange={handleMonthChange}
              size="large"
              cutoffDate={cutoffDate}
              fitHeight={!shouldUseScrollLayout}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
