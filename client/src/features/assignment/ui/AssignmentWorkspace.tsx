// src/features/assignment/ui/AssignmentWorkspace.tsx

import { useState, useRef, ChangeEvent, MouseEvent, useEffect, useMemo } from 'react';
import { useAssignment } from '../model/useAssignment';
import { Button, MiniCalendar, ConfirmModal } from '../../../shared/ui';
import { AssignmentDetailModal, AssignmentGroupDetailModal } from './AssignmentDetailModal';
import { UnassignedUnitDetailModal } from './UnassignedUnitDetailModal';

// ID 기반 선택 키
type SelectionKey =
  | { type: 'UNIT'; unitId: number }
  | { type: 'INSTRUCTOR'; instructorId: number }
  | null;

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

interface AssignmentWorkspaceProps {
  onRefreshReady?: (refresh: () => void) => void;
}

export const AssignmentWorkspace: React.FC<AssignmentWorkspaceProps> = ({ onRefreshReady }) => {
  const {
    dateRange,
    setDateRange,
    loading,
    error,
    groupedUnassignedUnits,
    availableInstructors,
    allInstructors,
    assignments,
    confirmedAssignments,
    distanceMap,
    distanceLimits,
    actualDateRange, // 전체 부대 스케줄 범위
    fetchData,
    executeAutoAssign,
    sendTemporaryMessages,
    sendConfirmedMessages,
  } = useAssignment();

  // ID 기반 선택 (스냅샷 대신 ID만 저장)
  const [selectionKey, setSelectionKey] = useState<SelectionKey>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);

  // 검색 상태
  const [unitSearch, setUnitSearch] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');

  type ModalKey = { unitId: number; bucket: 'PENDING' | 'ACCEPTED' } | null;
  const [detailModalKey, setDetailModalKey] = useState<ModalKey>(null);

  // 실시간 데이터 조회 (ID로 최신 데이터 찾기)
  const selectedUnit =
    selectionKey?.type === 'UNIT'
      ? groupedUnassignedUnits.find((u) => u.unitId === selectionKey.unitId)
      : null;

  // 선택된 부대에 배정된 날짜들 계산 (실제로 강사가 배정된 날짜만)
  const selectedUnitAssignedDates = useMemo(() => {
    if (!selectedUnit) return new Set<string>();

    const dates = new Set<string>();
    const allGroups = [...assignments, ...confirmedAssignments];

    // 해당 unitId에 일치하는 그룹에서 실제 배정된 날짜만 추출
    for (const group of allGroups) {
      if (group.unitId === selectedUnit.unitId) {
        // trainingLocations.dates에서 실제 강사가 배정된 날짜만 추출
        const locations = group.trainingLocations as Array<{
          dates?: Array<{
            date: string;
            instructors?: Array<{ instructorId: number; state?: string }>;
          }>;
        }>;
        for (const loc of locations) {
          for (const d of loc.dates || []) {
            // 실제로 배정된 강사가 있는 경우만 (Pending 또는 Accepted 상태)
            const hasAssignedInstructors =
              d.instructors &&
              d.instructors.some((inst) => inst.state === 'Pending' || inst.state === 'Accepted');
            if (d.date && hasAssignedInstructors) {
              dates.add(d.date);
            }
          }
        }
      }
    }
    return dates;
  }, [selectedUnit, assignments, confirmedAssignments]);

  const selectedInstructor =
    selectionKey?.type === 'INSTRUCTOR'
      ? availableInstructors.find((i) => i.id === selectionKey.instructorId)
      : null;

  const currentGroup =
    detailModalKey?.bucket === 'PENDING'
      ? assignments.find((g) => g.unitId === detailModalKey.unitId)
      : detailModalKey?.bucket === 'ACCEPTED'
        ? confirmedAssignments.find((g) => g.unitId === detailModalKey.unitId)
        : null;

  // 데이터 삭제 시 모달 자동 닫기
  useEffect(() => {
    if (selectionKey?.type === 'UNIT' && !selectedUnit) {
      setSelectionKey(null);
    }
    if (selectionKey?.type === 'INSTRUCTOR' && !selectedInstructor) {
      setSelectionKey(null);
    }
  }, [selectionKey, selectedUnit, selectedInstructor]);

  useEffect(() => {
    if (detailModalKey && !currentGroup) {
      setDetailModalKey(null);
    }
  }, [detailModalKey, currentGroup]);

  const [calendarPopup, setCalendarPopup] = useState<CalendarPopup>({
    visible: false,
    x: 0,
    y: 0,
    dates: [],
  });

  // 부모 컴포넌트에 refresh 함수 전달
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchData);
    }
  }, [onRefreshReady, fetchData]);

  // 날짜별 이미 배정된 강사 ID 맵 생성 (모든 부대 통합)
  const assignedByDate = useMemo(() => {
    const map = new Map<string, Set<number>>();
    const allGroups = [...assignments, ...confirmedAssignments];
    for (const group of allGroups) {
      for (const loc of (group as any).trainingLocations || []) {
        for (const dateInfo of loc.dates || []) {
          const dateStr = dateInfo.date as string;
          if (!dateStr) continue;
          if (!map.has(dateStr)) map.set(dateStr, new Set());
          for (const inst of dateInfo.instructors || []) {
            // Pending 또는 Accepted 상태인 배정만 포함
            if (inst.state === 'Pending' || inst.state === 'Accepted') {
              map.get(dateStr)!.add(inst.instructorId);
            }
          }
        }
      }
    }
    return map;
  }, [assignments, confirmedAssignments]);

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
    // YYYY-MM-DD 문자열을 로컬 자정으로 명시적 변환
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    setDateRange((prev) => ({ ...prev, [name]: date }));
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    // toISOString()은 UTC 기준이므로 로컬 시간 기준으로 직접 포맷
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    // 마우스가 팝업으로 이동할 시간을 주기 위해 딜레이 추가
    closeTimeoutRef.current = setTimeout(() => {
      setCalendarPopup({ visible: false, x: 0, y: 0, dates: [] });
    }, 150);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 1. Control Bar */}
      <div className="bg-white p-2 border-b border-gray-200 flex flex-wrap justify-between items-center shadow-sm gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-bold text-gray-800 whitespace-nowrap">배정 기간</h2>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-300">
            <input
              type="date"
              name="startDate"
              value={formatDate(dateRange.startDate)}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none text-xs text-gray-700 w-24"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              name="endDate"
              value={formatDate(dateRange.endDate)}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none text-xs text-gray-700 w-24"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button onClick={fetchData} disabled={loading} size="small">
            {loading ? '조회중' : '조회'}
          </Button>
          <button
            onClick={handleAutoAssignClick}
            disabled={loading || groupedUnassignedUnits.length === 0}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                           disabled:bg-gray-300 disabled:cursor-not-allowed
                           shadow-sm transition-all text-xs font-bold flex items-center gap-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
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
                배정중
              </>
            ) : (
              <>⚡ 자동배정</>
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
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min md:auto-rows-fr overflow-y-auto md:overflow-hidden bg-gray-100">
        {/* Left Column */}
        <div className="flex flex-col gap-4 h-fit md:h-auto md:overflow-hidden">
          {/* Panel 1: 미배정 부대 (교육단위별 그룹화) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-fit max-h-[35vh] md:flex-1 md:h-auto md:max-h-none">
            <div className="p-3 bg-red-50 border-b border-red-100 border-l-4 border-l-red-500 font-bold text-gray-700 flex justify-between items-center gap-2">
              <span className="flex items-center gap-2 shrink-0">📋 배정 대상 부대 (부대별)</span>
              <input
                type="text"
                placeholder="부대 검색..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                className="flex-1 max-w-48 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-red-200 text-red-600 font-bold shrink-0">
                {
                  groupedUnassignedUnits.filter(
                    (u) =>
                      u.unitName?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                      u.region?.toLowerCase().includes(unitSearch.toLowerCase()),
                  ).length
                }
                개 부대
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              <div className="space-y-3">
                {groupedUnassignedUnits
                  .filter(
                    (unit) =>
                      unit.unitName?.toLowerCase().includes(unitSearch.toLowerCase()) ||
                      unit.region?.toLowerCase().includes(unitSearch.toLowerCase()),
                  )
                  .map((unit) => (
                    <div
                      key={unit.unitId}
                      onClick={() => setSelectionKey({ type: 'UNIT', unitId: unit.unitId })}
                      className="bg-white border border-gray-200 rounded-lg p-2.5 cursor-pointer hover:shadow-md hover:border-red-300 transition-all border-l-4 border-l-transparent hover:border-l-red-400 group"
                    >
                      <div className="font-bold text-gray-800 text-xs flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span>{unit.unitName}</span>
                          {unit.locations.length > 1 && (
                            <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                              {unit.locations.length}개
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 mb-1">📍 {unit.region}</div>
                      <div className="flex flex-wrap gap-0.5">
                        {unit.uniqueDates.slice(0, 3).map((date, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded"
                          >
                            {date}
                          </span>
                        ))}
                        {unit.uniqueDates.length > 3 && (
                          <span className="text-[9px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded">
                            +{unit.uniqueDates.length - 3}일
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Panel 2: 가용 강사 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-fit max-h-[35vh] md:flex-1 md:h-auto md:max-h-none">
            <div className="p-3 bg-slate-50 border-b border-slate-100 border-l-4 border-l-slate-700 font-bold text-gray-700 flex items-center gap-2">
              <span className="shrink-0">👤 가용 강사</span>
              <input
                type="text"
                placeholder="강사 검색..."
                value={instructorSearch}
                onChange={(e) => setInstructorSearch(e.target.value)}
                className="flex-1 max-w-48 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 font-bold shrink-0">
                {
                  availableInstructors.filter(
                    (i) =>
                      i.name?.toLowerCase().includes(instructorSearch.toLowerCase()) ||
                      i.location?.toLowerCase().includes(instructorSearch.toLowerCase()) ||
                      i.teamName?.toLowerCase().includes(instructorSearch.toLowerCase()),
                  ).length
                }
                명
              </span>
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
                  {availableInstructors
                    .filter(
                      (inst) =>
                        inst.name?.toLowerCase().includes(instructorSearch.toLowerCase()) ||
                        inst.location?.toLowerCase().includes(instructorSearch.toLowerCase()) ||
                        inst.teamName?.toLowerCase().includes(instructorSearch.toLowerCase()),
                    )
                    .map((inst) => (
                      <div
                        key={inst.id}
                        onClick={() =>
                          setSelectionKey({ type: 'INSTRUCTOR', instructorId: inst.id })
                        }
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
                                : inst.category === 'Co'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : inst.category === 'Assistant'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : inst.category === 'Practicum'
                                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                                      : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {inst.category === 'Main'
                              ? '주'
                              : inst.category === 'Co'
                                ? '부'
                                : inst.category === 'Assistant'
                                  ? '보조'
                                  : inst.category === 'Practicum'
                                    ? '실습'
                                    : inst.category || 'N/A'}
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
        <div className="flex flex-col gap-4 h-fit md:h-auto md:overflow-hidden">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-fit max-h-[40vh] md:flex-1 md:h-auto md:max-h-none">
            <div className="p-3 bg-orange-50 border-b border-orange-100 border-l-4 border-l-orange-500 font-bold text-gray-700 flex justify-between items-center">
              <span>⚖️ 배정 작업 공간 (부대별)</span>
              <div className="flex gap-2">
                <Button size="xsmall" variant="ghost" onClick={handleAutoAssignClick}>
                  자동 배정
                </Button>
                {assignments.length > 0 && (
                  <Button size="xsmall" onClick={sendTemporaryMessages}>
                    📩 일괄 임시 메시지 전송
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
                <div className="space-y-2">
                  {assignments.map((group) => (
                    <div
                      key={group.unitId}
                      onClick={() => setDetailModalKey({ unitId: group.unitId, bucket: 'PENDING' })}
                      className={`bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 ${
                        group.totalAssigned === 0
                          ? 'border-l-gray-400 bg-gray-50/70'
                          : 'border-l-indigo-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{group.unitName}</h3>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {group.region}
                          </span>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-[10px] font-bold ${group.totalAssigned === 0 ? 'text-gray-500' : 'text-indigo-600'}`}
                          >
                            {group.period}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {group.trainingLocations.length}개 교육장
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[11px] font-medium ${group.totalAssigned === 0 ? 'text-gray-500' : 'text-orange-600'}`}
                        >
                          {group.totalAssigned === 0
                            ? '📋 강사 미배정 (클릭하여 배정)'
                            : `📨 ${group.totalAssigned}명 배정`}
                        </span>
                        {group.totalAssigned > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              (group as any).unsentCount > 0
                                ? 'text-blue-600 bg-blue-100'
                                : 'text-gray-500 bg-gray-100'
                            }`}
                          >
                            🔵 미발송 {(group as any).unsentCount ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel 4: 확정 배정 완료 */}
          <div className="md:flex-1 max-h-[40vh] md:max-h-none bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3 bg-blue-50 border-b border-blue-100 border-l-4 border-l-blue-500 font-bold text-gray-700 flex justify-between items-center">
              <span>✅ 확정 배정 완료</span>
              <button
                onClick={sendConfirmedMessages}
                disabled={confirmedAssignments.length === 0}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           disabled:bg-gray-300 disabled:cursor-not-allowed
                           shadow-sm transition-all text-xs font-bold flex items-center gap-1"
              >
                📩 일괄 확정 메시지 전송
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {confirmedAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  <span>아직 확정된 배정이 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmedAssignments.map((group) => (
                    <div
                      key={group.unitId}
                      onClick={() =>
                        setDetailModalKey({ unitId: group.unitId, bucket: 'ACCEPTED' })
                      }
                      className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{group.unitName}</h3>
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {group.region}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400">{group.period}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[11px] text-green-600 font-bold">
                          {group.totalAssigned}명 확정
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            (group as any).confirmedMessageSent
                              ? 'text-green-600 bg-green-100'
                              : 'text-blue-600 bg-blue-100'
                          }`}
                        >
                          {(group as any).confirmedMessageSent ? '📩 발송완료' : '📨 미발송'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 캘린더 팝업 (Overlay) */}

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
      {selectedUnit && (
        <UnassignedUnitDetailModal
          unit={selectedUnit}
          onClose={() => setSelectionKey(null)}
          onSave={fetchData}
          assignedDates={selectedUnitAssignedDates}
        />
      )}

      {/* 강사 상세 모달 */}
      {selectedInstructor && (
        <AssignmentDetailModal
          item={{ ...selectedInstructor, type: 'INSTRUCTOR' } as any}
          onClose={() => setSelectionKey(null)}
        />
      )}

      {detailModalKey && currentGroup && (
        <AssignmentGroupDetailModal
          group={currentGroup as any}
          onClose={() => setDetailModalKey(null)}
          onSaveComplete={async () => {
            await fetchData();
          }}
          availableInstructors={availableInstructors.map((i) => ({
            id: i.id,
            name: i.name,
            team: i.teamName,
            teamName: i.teamName,
            category: i.category ?? undefined,
            availableDates: i.availableDates ?? [],
          }))}
          allInstructors={allInstructors.map((i) => ({
            id: i.id,
            name: i.name,
            team: i.teamName,
            teamName: i.teamName,
            category: i.category ?? undefined,
            availableDates: i.availableDates ?? [],
          }))}
          assignedByDate={assignedByDate}
          allAssignments={assignments}
          allConfirmedAssignments={confirmedAssignments}
          distanceMap={distanceMap}
          distanceLimits={distanceLimits}
          actualDateRange={actualDateRange}
          queryDateRange={
            dateRange.startDate && dateRange.endDate
              ? {
                  startDate: new Date(dateRange.startDate),
                  endDate: new Date(dateRange.endDate),
                }
              : undefined
          }
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
