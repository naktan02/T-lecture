// src/features/assignment/ui/AssignmentWorkspace.tsx

import { useState, useRef, ChangeEvent, MouseEvent } from 'react';
import { useAssignment } from '../model/useAssignment';
import { Button, MiniCalendar, ConfirmModal } from '../../../shared/ui';
import { AssignmentDetailModal, AssignmentGroupDetailModal } from './AssignmentDetailModal';
import { UnassignedUnitDetailModal } from './UnassignedUnitDetailModal';
import { GroupedUnassignedUnit } from '../model/useAssignment';

interface SelectedItem {
  type: 'UNIT' | 'INSTRUCTOR';
  [key: string]: unknown;
}

interface CalendarPopup {
  visible: boolean;
  x: number;
  y: number;
  dates: string[];
}

export interface AssignmentGroup {
  unitId: number;
  unitName: string;
  region: string;
  period: string;
  trainingLocations: unknown[];
  totalAssigned: number;
  totalRequired: number;
  progress: number;
  [key: string]: unknown;
}

export const AssignmentWorkspace: React.FC = () => {
  const {
    dateRange,
    setDateRange,
    loading,
    error,
    groupedUnassignedUnits,
    availableInstructors,
    assignments,
    confirmedAssignments,
    fetchData,
    executeAutoAssign,
    saveAssignments,
    removeAssignment,
  } = useAssignment();

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);
  const [detailModalData, setDetailModalData] = useState<AssignmentGroup | null>(null);

  const [calendarPopup, setCalendarPopup] = useState<CalendarPopup>({
    visible: false,
    x: 0,
    y: 0,
    dates: [],
  });

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAutoAssignClick = () => {
    setShowAutoAssignConfirm(true);
  };

  const confirmAutoAssign = async () => {
    setShowAutoAssignConfirm(false);
    await executeAutoAssign();
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    if (!value) return;
    setDateRange((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleMouseEnter = (
    e: MouseEvent<HTMLSpanElement> | null,
    dates: string[] | null | undefined,
  ): void => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (dates && e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const popupHeight = 320;
      const popupWidth = 240;

      // 기본 위치: 요소 오른쪽
      let posX = rect.right + 10;
      let posY = rect.top;

      // 하단 경계 체크: 팝업이 화면 아래로 넘어가면 위로 조정
      if (rect.top + popupHeight > window.innerHeight) {
        posY = Math.max(10, window.innerHeight - popupHeight - 10);
      }

      // 우측 경계 체크: 팝업이 화면 오른쪽으로 넘어가면 왼쪽에 표시
      if (rect.right + popupWidth + 10 > window.innerWidth) {
        posX = Math.max(10, rect.left - popupWidth - 10);
      }

      setCalendarPopup({
        visible: true,
        x: posX,
        y: posY,
        dates: dates,
      });
    }
  };

  const handleMouseLeave = (): void => {
    closeTimeoutRef.current = setTimeout(() => {
      setCalendarPopup((prev) => ({ ...prev, visible: false }));
    }, 300);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 1. Control Bar */}
      <div className="bg-white p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800">배정 기간 설정</h2>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-300">
            <input
              type="date"
              name="startDate"
              value={formatDate(dateRange.startDate)}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none text-sm text-gray-700"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              name="endDate"
              value={formatDate(dateRange.endDate)}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none text-sm text-gray-700"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading} size="medium">
            {loading ? '조회 중...' : '조회하기'}
          </Button>
          <button
            onClick={handleAutoAssignClick}
            disabled={loading || groupedUnassignedUnits.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                           disabled:bg-gray-300 disabled:cursor-not-allowed
                           shadow-sm transition-all text-sm font-bold flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                배정 중...
              </>
            ) : (
              <>⚡ 자동 배정 실행</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 text-sm border-b border-red-100">
          ⚠️ {error}
        </div>
      )}

      {/* 2. Main Workspace (Grid) */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden bg-gray-100">
        {/* Left Column */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Panel 1: 미배정 부대 (교육단위별 그룹화) */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-red-50 border-b border-red-100 border-l-4 border-l-red-500 font-bold text-gray-700 flex justify-between items-center">
              <span className="flex items-center gap-2">📋 배정 대상 부대 (부대별)</span>
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-red-200 text-red-600 font-bold">
                {groupedUnassignedUnits.length}개 부대
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              <div className="space-y-3">
                {groupedUnassignedUnits.map((unit) => (
                  <div
                    key={unit.unitId}
                    onClick={() => setSelectedItem({ ...unit, type: 'UNIT' })}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-red-300 transition-all border-l-4 border-l-transparent hover:border-l-red-400 group"
                  >
                    <div className="font-bold text-gray-800 text-sm flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span>{unit.unitName}</span>
                        {unit.locations.length > 1 && (
                          <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {unit.locations.length}개 장소
                          </span>
                        )}
                      </div>
                      <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold border border-blue-100 text-xs">
                        총 {unit.totalRequired}명 필요
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">📍 {unit.region}</div>
                    <div className="flex flex-wrap gap-1">
                      {unit.uniqueDates.slice(0, 5).map((date, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {date}
                        </span>
                      ))}
                      {unit.uniqueDates.length > 5 && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          +{unit.uniqueDates.length - 5}일
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 2: 가용 강사 */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 border-l-4 border-l-slate-700 font-bold text-gray-700">
              <span>👤 가용 강사</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {loading && availableInstructors.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">로딩 중...</div>
              ) : availableInstructors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  <span className="text-2xl mb-2">🚫</span>
                  <span>가용 가능한 강사가 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-2 pb-20">
                  {availableInstructors.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => setSelectedItem({ ...inst, type: 'INSTRUCTOR' })}
                      className="relative bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-slate-400 transition-all border-l-4 border-l-transparent hover:border-l-slate-600"
                    >
                      <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        {inst.name}

                        {inst.teamName && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                            {inst.teamName}
                          </span>
                        )}

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            inst.category === 'Main'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : inst.category === 'Assistant'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {inst.category || 'N/A'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                        <span>📍 {inst.location}</span>
                        <span
                          className="text-blue-600 font-medium cursor-help hover:bg-blue-50 px-1 rounded transition-colors"
                          onMouseEnter={(e) => handleMouseEnter(e, inst.availableDates)}
                          onMouseLeave={handleMouseLeave}
                        >
                          📅 {inst.availableDates?.length || 0}일 가능
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-orange-50 border-b border-orange-100 border-l-4 border-l-orange-500 font-bold text-gray-700 flex justify-between items-center">
              <span>⚖️ 배정 작업 공간 (부대별)</span>
              <div className="flex gap-2">
                <Button size="xsmall" variant="ghost" onClick={handleAutoAssignClick}>
                  자동 배정
                </Button>
                {assignments.length > 0 && (
                  <Button size="xsmall" onClick={saveAssignments}>
                    저장
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {assignments.length === 0 ? (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 m-4 rounded-xl">
                  <div className="text-center text-gray-400">임시 배정이 없습니다.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((group) => (
                    <div
                      key={group.unitId}
                      onClick={() => setDetailModalData(group)}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-indigo-500"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{group.unitName}</h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {group.region}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-indigo-600">{group.period}</div>
                          <div className="text-xs text-gray-400">
                            총 {group.trainingLocations.length}개 교육장
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">배정 현황</span>
                          <span
                            className={`font-bold ${group.totalAssigned > 0 ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {group.totalAssigned}명 배정
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${group.progress >= 100 ? 'bg-green-500' : 'bg-orange-400'}`}
                            style={{ width: `${Math.min(group.progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel 4: 확정 배정 완료 */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-blue-50 border-b border-blue-100 border-l-4 border-l-blue-500 font-bold text-gray-700">
              <span>✅ 확정 배정 완료</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {confirmedAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  <span>아직 확정된 배정이 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {confirmedAssignments.map((group) => (
                    <div
                      key={group.unitId}
                      onClick={() => setDetailModalData(group)}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-blue-500"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{group.unitName}</h3>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {group.region}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{group.period}</span>
                      </div>
                      <div className="text-sm text-green-600 font-bold">
                        {group.totalAssigned}명 확정
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      <AssignmentDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {/* 캘린더 팝업 (Overlay) */}
      {calendarPopup.visible && (
        <div
          className="fixed z-popover"
          style={{
            top: calendarPopup.y,
            left: calendarPopup.x,
          }}
          onMouseEnter={() => handleMouseEnter(null, null)}
          onMouseLeave={handleMouseLeave}
        >
          <MiniCalendar
            availableDates={calendarPopup.dates}
            width="220px"
            className="shadow-2xl border-blue-200 ring-2 ring-blue-100 bg-white"
          />
        </div>
      )}

      {/* 미배정 부대 상세 모달 */}
      {selectedItem && selectedItem.type === 'UNIT' && (
        <UnassignedUnitDetailModal
          unit={selectedItem as unknown as GroupedUnassignedUnit}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* 강사 상세 모달 */}
      {selectedItem && selectedItem.type === 'INSTRUCTOR' && (
        <AssignmentDetailModal item={selectedItem as any} onClose={() => setSelectedItem(null)} />
      )}

      {detailModalData && (
        <AssignmentGroupDetailModal
          group={detailModalData as any}
          onClose={() => setDetailModalData(null)}
          onRemove={removeAssignment}
          availableInstructors={availableInstructors}
        />
      )}

      {/* 자동 배정 확인 모달 */}
      <ConfirmModal
        isOpen={showAutoAssignConfirm}
        title="자동 배정 실행"
        message={
          <div>
            <p>현재 조건으로 자동 배정을 실행하시겠습니까?</p>
            <p className="text-sm text-gray-500 mt-2">
              * 기존 배정 이력은 초기화되지 않으며, 미배정된 건에 대해서만 수행됩니다.
            </p>
          </div>
        }
        confirmText="실행"
        cancelText="취소"
        onConfirm={confirmAutoAssign}
        onCancel={() => setShowAutoAssignConfirm(false)}
      />
    </div>
  );
};
