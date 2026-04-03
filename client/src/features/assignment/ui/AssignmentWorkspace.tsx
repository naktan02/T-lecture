// src/features/assignment/ui/AssignmentWorkspace.tsx

import { useState, useRef, ChangeEvent, MouseEvent, useEffect, useMemo, useCallback } from 'react';
import { useAssignment } from '../model/useAssignment';
import { Button, MiniCalendar, TutorialModal } from '../../../shared/ui';
import { AssignmentDetailModal, AssignmentGroupDetailModal } from './AssignmentDetailModal';
import { UnassignedUnitDetailModal } from './UnassignedUnitDetailModal';
import { batchUpdateAssignmentsApi } from '../assignmentApi';
import { showSuccess, showError, showConfirm } from '../../../shared/utils/toast';
import type { AssignmentData } from '../model/useAssignment';

// ID 기반 선택 키
type SelectionKey =
  | { type: 'UNIT'; groupKey: string }
  | { type: 'INSTRUCTOR'; instructorId: number }
  | null;

interface CalendarPopup {
  visible: boolean;
  x: number;
  y: number;
  dates: string[];
}

export interface AssignmentGroup {
  groupKey: string;
  unitId: number;
  trainingPeriodId: number;
  trainingPeriodName?: string;
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
    actualDateRange, // 전체 부대 스케줄 범위
    fetchData,
    executeAutoAssign,
    sendTemporaryMessages,
    sendConfirmedMessages,
  } = useAssignment();

  // ID 기반 선택 (스냅샷 대신 ID만 저장)
  const [selectionKey, setSelectionKey] = useState<SelectionKey>(null);

  // 튜토리얼 모달 상태
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // 검색 상태
  const [unitSearch, setUnitSearch] = useState('');
  const [instructorSearch, setInstructorSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [confirmedSearch, setConfirmedSearch] = useState('');

  type ModalKey = { groupKey: string; bucket: 'PENDING' | 'ACCEPTED' } | null;
  const [detailModalKey, setDetailModalKey] = useState<ModalKey>(null);

  // 표 모달 상태: 'PENDING' = 배정 작업 공간, 'ACCEPTED' = 확정 배정
  const [tableModal, setTableModal] = useState<'PENDING' | 'ACCEPTED' | null>(null);
  // 표에서 행 진입 시 사용하는 상세 모달 키 (표 모달 위에 표시)
  const [tableDetailKey, setTableDetailKey] = useState<ModalKey>(null);

  // 표에서 선택된 그룹 (상세 모달용)
  const tableDetailGroup =
    tableDetailKey?.bucket === 'PENDING'
      ? assignments.find((g) => g.groupKey === tableDetailKey.groupKey)
      : tableDetailKey?.bucket === 'ACCEPTED'
        ? confirmedAssignments.find((g) => g.groupKey === tableDetailKey.groupKey)
        : null;

  // 그룹에서 유니크 강사 이름 추출 헬퍼
  const getUniqueInstructorNames = useCallback((group: AssignmentData): string => {
    const names = new Set<string>();
    for (const loc of group.trainingLocations as any[]) {
      for (const d of loc.dates || []) {
        for (const inst of d.instructors || []) {
          if (inst.name && (inst.state === 'Pending' || inst.state === 'Accepted')) {
            names.add(inst.name);
          }
        }
      }
    }
    return names.size > 0 ? Array.from(names).join(', ') : '-';
  }, []);

  // 그룹의 최대 참여인원 계산 헬퍼 (가장 많은 날의 actualCount)
  const getMaxActualCount = useCallback((group: AssignmentData): number => {
    let max = 0;
    for (const loc of group.trainingLocations as any[]) {
      for (const d of loc.dates || []) {
        const count = d.actualCount ?? 0;
        if (count > max) max = count;
      }
    }
    return max;
  }, []);

  // 그룹 상태 라벨 계산 헬퍼
  const getStatusLabel = useCallback(
    (group: AssignmentData): { text: string; className: string } => {
      // messageSent 기반으로 상태 판별 (필터 로직과 일관)
      const allInstructors: { state: string; messageSent: boolean }[] = [];
      for (const loc of group.trainingLocations as any[]) {
        for (const d of loc.dates || []) {
          for (const i of d.instructors || []) {
            if (i.state === 'Pending' || i.state === 'Accepted') {
              allInstructors.push({ state: i.state, messageSent: !!i.messageSent });
            }
          }
        }
      }
      const anyMessageSent = allInstructors.some((i) => i.messageSent);
      const hasPending = allInstructors.some((i) => i.state === 'Pending');

      if (!anyMessageSent) return { text: '미배정', className: 'bg-gray-200 text-gray-700' };
      if (hasPending) return { text: '미응답', className: 'bg-yellow-100 text-yellow-700' };
      return { text: '응답 완료', className: 'bg-green-100 text-green-700' };
    },
    [],
  );

  // 실시간 데이터 조회 (ID로 최신 데이터 찾기)
  const selectedUnit =
    selectionKey?.type === 'UNIT'
      ? groupedUnassignedUnits.find((u) => u.groupKey === selectionKey.groupKey)
      : null;

  // 선택된 부대에 배정된 날짜들 계산 (실제로 강사가 배정된 날짜만)
  const selectedUnitAssignedDates = useMemo(() => {
    if (!selectedUnit) return new Set<string>();

    const dates = new Set<string>();
    const allGroups = [...assignments, ...confirmedAssignments];

    // 해당 unitId에 일치하는 그룹에서 실제 배정된 날짜만 추출
    for (const group of allGroups) {
      if (group.groupKey === selectedUnit.groupKey) {
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
      ? assignments.find((g) => g.groupKey === detailModalKey.groupKey)
      : detailModalKey?.bucket === 'ACCEPTED'
        ? confirmedAssignments.find((g) => g.groupKey === detailModalKey.groupKey)
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

  // 배정 작업 공간 필터 (다중 선택 지원)
  type AssignmentFilterType = 'UNASSIGNED' | 'UNRESPONDED' | 'ACCEPTED';
  const [assignmentFilters, setAssignmentFilters] = useState<AssignmentFilterType[]>([]);

  const toggleFilter = (filter: AssignmentFilterType) => {
    setAssignmentFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );
  };

  const filteredAssignments = useMemo(() => {
    let result = assignments;

    // 1. 텍스트 검색
    if (assignmentSearch.trim() !== '') {
      const q = assignmentSearch.toLowerCase();
      result = result.filter(
        (g) =>
          g.unitName?.toLowerCase().includes(q) ||
          g.region?.toLowerCase().includes(q) ||
          g.trainingPeriodName?.toLowerCase().includes(q) ||
          g.period?.toLowerCase().includes(q),
      );
    }

    // 2. 상태 필터 (미배정, 미응답, 응답 완료)
    if (assignmentFilters.length === 0) return result; // 필터가 없으면 검색 결과만 반환

    return result.filter((g) => {
      // 그룹 내 모든 강사의 상태를 평면화하여 추출
      const allInstructors: { state: string; messageSent: boolean }[] = [];
      (g.trainingLocations as any[]).forEach((loc: any) => {
        loc.dates?.forEach((d: any) => {
          d.instructors?.forEach((i: any) => {
            if (i.state === 'Pending' || i.state === 'Accepted') {
              allInstructors.push({ state: i.state, messageSent: !!i.messageSent });
            }
          });
        });
      });

      // 메시지를 보낸 강사가 있는지
      const anyMessageSent = allInstructors.some((i) => i.messageSent);
      // Pending 상태인 강사가 있는지
      const hasPending = allInstructors.some((i) => i.state === 'Pending');

      // 미배정: 메시지가 한 번도 발송되지 않은 상태 (강사가 0이거나, 배정은 했지만 발송 안 한 경우)
      const isUnassigned = !anyMessageSent;
      // 미응답: 메시지를 보냈으나 아직 Pending(응답 대기)인 강사가 남아있는 상태
      const isUnresponded = anyMessageSent && hasPending;
      // 응답 완료: 메시지를 보냈고 Pending인 강사가 없는 상태 (모두 응답함)
      const isAccepted = anyMessageSent && !hasPending;

      // 다중 선택된 필터 중 하나라도 만족하면 목록에 포함 (OR 조건)
      if (assignmentFilters.includes('UNASSIGNED') && isUnassigned) return true;
      if (assignmentFilters.includes('UNRESPONDED') && isUnresponded) return true;
      if (assignmentFilters.includes('ACCEPTED') && isAccepted) return true;

      return false;
    });
  }, [assignments, assignmentFilters, assignmentSearch]);

  // 확정 배정 완료 필터링 리스트 (텍스트 검색)
  const filteredConfirmedAssignments = useMemo(() => {
    let result = confirmedAssignments;

    if (confirmedSearch.trim() !== '') {
      const q = confirmedSearch.toLowerCase();
      result = result.filter(
        (g) =>
          g.unitName?.toLowerCase().includes(q) ||
          g.region?.toLowerCase().includes(q) ||
          g.trainingPeriodName?.toLowerCase().includes(q) ||
          g.period?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [confirmedAssignments, confirmedSearch]);

  // 각 필터별 카운트 계산 (같은 로직 사용)
  const filterCounts = useMemo(() => {
    let unassigned = 0,
      unresponded = 0,
      accepted = 0;

    for (const g of assignments) {
      const allInstructors: { state: string; messageSent: boolean }[] = [];
      (g.trainingLocations as any[]).forEach((loc: any) => {
        loc.dates?.forEach((d: any) => {
          d.instructors?.forEach((i: any) => {
            if (i.state === 'Pending' || i.state === 'Accepted') {
              allInstructors.push({ state: i.state, messageSent: !!i.messageSent });
            }
          });
        });
      });

      const anyMessageSent = allInstructors.some((i) => i.messageSent);
      const hasPending = allInstructors.some((i) => i.state === 'Pending');

      if (!anyMessageSent) unassigned++;
      else if (hasPending) unresponded++;
      else accepted++;
    }

    return { unassigned, unresponded, accepted };
  }, [assignments]);

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
              className="bg-transparent focus:outline-none text-xs text-gray-700 w-[115px]"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              name="endDate"
              value={formatDate(dateRange.endDate)}
              onChange={handleDateChange}
              className="bg-transparent focus:outline-none text-xs text-gray-700 w-[115px]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button onClick={fetchData} disabled={loading} size="small">
            {loading ? '조회중' : '조회'}
          </Button>
          <Button variant="outline" size="small" onClick={executeAutoAssign} disabled={loading}>
            🤖 자동 배정
          </Button>
          <button
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            title="강사 배정 사용법 보기"
          >
            💡 사용법
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
          {/* Panel 1: 미배정 부대 (교육기간별 그룹화) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-fit max-h-[35vh] md:flex-1 md:h-auto md:max-h-none">
            <div className="p-3 bg-red-50 border-b border-red-100 border-l-4 border-l-red-500 font-bold text-gray-700 flex justify-between items-center gap-2">
              <span className="flex items-center gap-2 shrink-0">
                📋 배정 대상 부대 (교육기간별)
              </span>
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
                      key={unit.groupKey}
                      onClick={() => setSelectionKey({ type: 'UNIT', groupKey: unit.groupKey })}
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
                      {unit.trainingPeriodName && (
                        <div className="text-[10px] text-indigo-600 mb-1">
                          {unit.trainingPeriodName}
                        </div>
                      )}
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
            <div className="p-3 bg-orange-50 border-b border-orange-100 border-l-4 border-l-orange-500 flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-700 mt-1">⚖️ 배정 작업 공간 (부대별)</span>
                <input
                  type="text"
                  placeholder="부대/지역/기간 검색..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="w-full max-w-48 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  {assignments.length > 0 && (
                    <button
                      onClick={() => setTableModal('PENDING')}
                      className="px-2.5 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 shadow-sm transition-all text-xs font-bold flex items-center gap-1"
                    >
                      📊 펼치기
                    </button>
                  )}
                  {assignments.length > 0 && (
                    <Button size="xsmall" onClick={sendTemporaryMessages}>
                      📩 일괄 임시 메시지 전송
                    </Button>
                  )}
                </div>
                <div className="flex gap-1.5 text-xs">
                  <button
                    className={`px-2 py-1 rounded-md transition-colors ${assignmentFilters.includes('UNASSIGNED') ? 'bg-orange-600 text-white font-bold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => toggleFilter('UNASSIGNED')}
                  >
                    미배정 ({filterCounts.unassigned})
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md transition-colors ${assignmentFilters.includes('UNRESPONDED') ? 'bg-orange-600 text-white font-bold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => toggleFilter('UNRESPONDED')}
                  >
                    미응답 ({filterCounts.unresponded})
                  </button>
                  <button
                    className={`px-2 py-1 rounded-md transition-colors ${assignmentFilters.includes('ACCEPTED') ? 'bg-orange-600 text-white font-bold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => toggleFilter('ACCEPTED')}
                  >
                    응답 완료 ({filterCounts.accepted})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {filteredAssignments.length === 0 ? (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 m-4 rounded-xl">
                  <div className="text-center text-gray-400">조건에 맞는 배정이 없습니다.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssignments.map((group) => (
                    <div
                      key={group.groupKey}
                      onClick={() =>
                        setDetailModalKey({ groupKey: group.groupKey, bucket: 'PENDING' })
                      }
                      className={`bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 ${
                        group.totalAssigned === 0
                          ? 'border-l-gray-400 bg-gray-50/70'
                          : 'border-l-indigo-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{group.unitName}</h3>
                          {group.trainingPeriodName && (
                            <div className="text-[10px] text-indigo-600 mt-0.5">
                              {group.trainingPeriodName}
                            </div>
                          )}
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
                          <div className="flex items-center gap-1.5">
                            {/* 미발송 강사 취소 버튼 */}
                            {(group as any).unsentCount > 0 && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const confirmed = await showConfirm(
                                    `${group.unitName}의 미발송 강사 ${(group as any).unsentCount}명을 일괄 취소하시겠습니까?`,
                                  );
                                  if (!confirmed) return;
                                  try {
                                    // messageSent===false인 강사들의 unitScheduleId + instructorId 수집
                                    const removeList: {
                                      unitScheduleId: number;
                                      instructorId: number;
                                    }[] = [];
                                    for (const loc of group.trainingLocations as any[]) {
                                      for (const d of loc.dates || []) {
                                        for (const inst of d.instructors || []) {
                                          if (!inst.messageSent) {
                                            removeList.push({
                                              unitScheduleId: d.unitScheduleId,
                                              instructorId: inst.instructorId,
                                            });
                                          }
                                        }
                                      }
                                    }
                                    if (removeList.length === 0) return;
                                    await batchUpdateAssignmentsApi({
                                      add: [],
                                      remove: removeList,
                                      roleChanges: [],
                                      staffLockChanges: [],
                                      stateChanges: [],
                                    });
                                    showSuccess(`${removeList.length}건 배정 취소 완료`);
                                    await fetchData();
                                  } catch (err) {
                                    showError((err as Error).message);
                                  }
                                }}
                                className="text-[10px] px-1.5 py-0.5 text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium"
                                title="미발송 강사 일괄 취소"
                              >
                                🚫 강사취소
                              </button>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                (group as any).unsentCount > 0
                                  ? 'text-blue-600 bg-blue-100'
                                  : 'text-gray-500 bg-gray-100'
                              }`}
                            >
                              🔵 미발송 {(group as any).unsentCount ?? 0}
                            </span>
                          </div>
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
            <div className="p-3 bg-blue-50 border-b border-blue-100 border-l-4 border-l-blue-500 flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-700 mt-1">✅ 확정 배정 완료</span>
                <input
                  type="text"
                  placeholder="부대/지역/기간 검색..."
                  value={confirmedSearch}
                  onChange={(e) => setConfirmedSearch(e.target.value)}
                  className="w-full max-w-48 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  {confirmedAssignments.length > 0 && (
                    <button
                      onClick={() => setTableModal('ACCEPTED')}
                      className="px-2.5 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 shadow-sm transition-all text-xs font-bold flex items-center gap-1"
                    >
                      📊 펼치기
                    </button>
                  )}
                  <button
                    onClick={sendConfirmedMessages}
                    disabled={confirmedAssignments.length === 0}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-all text-xs font-bold flex items-center gap-1"
                  >
                    📩 일괄 확정 메시지 전송
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {filteredConfirmedAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                  <span>아직 확정된 배정이 없습니다.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConfirmedAssignments.map((group) => (
                    <div
                      key={group.groupKey}
                      onClick={() =>
                        setDetailModalKey({ groupKey: group.groupKey, bucket: 'ACCEPTED' })
                      }
                      className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:shadow-md cursor-pointer transition-all border-l-4 border-l-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{group.unitName}</h3>
                          {group.trainingPeriodName && (
                            <div className="text-[10px] text-indigo-600 mt-0.5">
                              {group.trainingPeriodName}
                            </div>
                          )}
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
          unit={selectedUnit as any}
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

      {/* 자동 배정 모달 삭제됨 */}

      {/* 표 모달 (펼치기) */}
      {tableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl h-[90dvh] md:h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeInScale">
            {/* 표 모달 헤더 */}
            <div className="bg-white px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {tableModal === 'PENDING' ? '⚖️ 배정 작업 공간' : '✅ 확정 배정 완료'}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({(tableModal === 'PENDING' ? filteredAssignments : confirmedAssignments).length}
                  건)
                </span>
              </h2>
              <button
                onClick={() => setTableModal(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* 표 본문 */}
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 sticky top-0 z-10">
                    <th className="px-2 py-2.5 border border-gray-200 text-center w-10">#</th>
                    <th className="px-3 py-2.5 border border-gray-200 text-left">부대명</th>
                    <th className="px-3 py-2.5 border border-gray-200 text-left">지역</th>
                    <th className="px-3 py-2.5 border border-gray-200 text-left">일정</th>
                    <th className="px-2 py-2.5 border border-gray-200 text-center w-16">인원수</th>
                    <th className="px-2 py-2.5 border border-gray-200 text-center w-16">교육장</th>
                    <th className="px-3 py-2.5 border border-gray-200 text-left min-w-[120px]">
                      배정 강사
                    </th>
                    <th className="px-2 py-2.5 border border-gray-200 text-center w-20">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {(tableModal === 'PENDING' ? filteredAssignments : confirmedAssignments).map(
                    (group, idx) => {
                      const status = getStatusLabel(group);
                      return (
                        <tr
                          key={group.groupKey}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                          onClick={() =>
                            setTableDetailKey({
                              groupKey: group.groupKey,
                              bucket: tableModal === 'PENDING' ? 'PENDING' : 'ACCEPTED',
                            })
                          }
                        >
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 font-medium text-gray-800">
                            <div>{group.unitName}</div>
                            {group.trainingPeriodName && (
                              <div className="text-[10px] text-indigo-600 mt-0.5">
                                {group.trainingPeriodName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-gray-600">
                            {group.region}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-gray-600 whitespace-nowrap">
                            {group.period}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-600">
                            {getMaxActualCount(group) || '-'}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-600">
                            {(group.trainingLocations as any[]).length}개
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-gray-700 break-words">
                            {getUniqueInstructorNames(group)}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )}
                  {(tableModal === 'PENDING' ? filteredAssignments : confirmedAssignments)
                    .length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-gray-400 border border-gray-200"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 표 모달 위에 띄우는 상세 모달 */}
      {tableDetailKey && tableDetailGroup && (
        <AssignmentGroupDetailModal
          group={tableDetailGroup as any}
          onClose={() => setTableDetailKey(null)}
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

      {/* 튜토리얼 모달 */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="강사 배정"
        imageDir="/images/tutorial/assignment"
      />
    </div>
  );
};
