// src/features/assignment/ui/InstructorGridPopup.tsx
// PC용 대형 엑셀 스타일 강사 가용일 그리드 팝업

import { useState, useMemo, ChangeEvent } from 'react';
import { Button } from '../../../shared/ui';

// --- Types ---
interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface Instructor {
  id: number;
  name: string;
  team?: string;
  teamName?: string;
  category?: string;
  availableDates?: string[];
}

interface AssignmentData {
  unitId: number;
  trainingLocations: Array<{
    id: number;
    dates: Array<{
      unitScheduleId: number;
      date: string;
      instructors: Array<{
        instructorId: number;
        state?: string | null;
      }>;
    }>;
  }>;
}

interface InstructorGridPopupProps {
  target: {
    date: string;
    unitId?: number;
    locationName?: string;
    unitScheduleId?: number;
    trainingLocationId?: number;
  };
  // 전체 조회 기간 (배정 페이지에서 조회한 날짜 범위) - 더 이상 사용 안함
  queryDateRange: DateRange;
  // 교육 기간 (헤더 하이라이트용)
  educationDateRange?: DateRange;
  // 전체 부대 스케줄 범위 (날짜 열 표시용)
  actualDateRange?: { startDate: string; endDate: string } | null;
  allAvailableInstructors: Instructor[];
  allInstructors?: Instructor[];
  assignments: AssignmentData[];
  confirmedAssignments: AssignmentData[];
  assignedByDate?: Map<string, Set<number>>; // 날짜별 다른 부대에 배정된 강사 ID
  // 거리 정보
  distanceMap?: Record<string, number>; // `${instructorId}-${unitId}` → km
  onClose: () => void;
  onAddMultiple: (instructors: Instructor[]) => void; // 다중 선택 추가
  onInstructorClick?: (instructorId: number) => void;
}

type TabType = 'AVAILABLE' | 'ALL';

// 날짜 범위에서 날짜 배열 생성
const generateDateRange = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// 날짜에서 일만 추출 (헤더용 - 더 간결하게)
const formatDateShort = (dateStr: string): string => {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
};

// 요일 계산
const getDayOfWeek = (dateStr: string): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

// 주말 체크
const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6;
};

// 날짜가 범위 내에 있는지 체크
const isDateInRange = (dateStr: string, range: DateRange): boolean => {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const start = new Date(range.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.endDate);
  end.setHours(0, 0, 0, 0);
  return date >= start && date <= end;
};

export const InstructorGridPopup: React.FC<InstructorGridPopupProps> = ({
  target,
  // queryDateRange는 더 이상 사용하지 않음 - actualDateRange 기준으로 표시
  educationDateRange,
  actualDateRange, // 전체 부대 스케줄 범위
  allAvailableInstructors = [],
  allInstructors = [],
  assignments = [],
  confirmedAssignments = [],
  assignedByDate = new Map(),
  distanceMap = {},
  onClose,
  onAddMultiple,
  onInstructorClick,
}) => {
  const [tab, setTab] = useState<TabType>('AVAILABLE');
  const [search, setSearch] = useState<string>('');
  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 전체 부대 스케줄 범위 내 모든 날짜 배열 (actualDateRange 사용)
  // actualDateRange가 없으면 educationDateRange fallback
  const allDates = useMemo(() => {
    if (actualDateRange) {
      return generateDateRange(
        new Date(actualDateRange.startDate),
        new Date(actualDateRange.endDate),
      );
    }
    if (educationDateRange) {
      return generateDateRange(educationDateRange.startDate, educationDateRange.endDate);
    }
    return [];
  }, [actualDateRange, educationDateRange]);

  // 날짜별 배정 상태 조회 (현재 부대 + 타부대 모두)
  const getAssignmentState = useMemo(() => {
    // 전처리: 날짜+강사ID → 배정상태 맵 생성 (현재 부대)
    const currentUnitMap = new Map<string, 'Pending' | 'Accepted'>();
    // 타부대 배정 맵 (assignedByDate에서 어떤 상태인지 확인)
    const otherUnitMap = new Map<string, 'Pending' | 'Accepted'>();

    const processAssignments = (alist: AssignmentData[], state: 'Pending' | 'Accepted') => {
      alist.forEach((assignment) => {
        assignment.trainingLocations?.forEach((loc) => {
          loc.dates?.forEach((d) => {
            d.instructors?.forEach((inst) => {
              const key = `${d.date}-${inst.instructorId}`;
              if (assignment.unitId === target.unitId) {
                // 현재 부대
                const existing = currentUnitMap.get(key);
                if (existing !== 'Accepted') {
                  currentUnitMap.set(key, state);
                }
              } else {
                // 타부대
                const existing = otherUnitMap.get(key);
                if (existing !== 'Accepted') {
                  otherUnitMap.set(key, state);
                }
              }
            });
          });
        });
      });
    };

    processAssignments(assignments, 'Pending');
    processAssignments(confirmedAssignments, 'Accepted');

    return (date: string, instructorId: number): 'Pending' | 'Accepted' | null => {
      const key = `${date}-${instructorId}`;
      // 현재 부대 배정 우선
      const currentState = currentUnitMap.get(key);
      if (currentState) return currentState;

      // 타부대 배정 확인
      const otherState = otherUnitMap.get(key);
      if (otherState) return otherState;

      // assignedByDate 확인 (임시배정으로 간주)
      if (assignedByDate.get(date)?.has(instructorId)) {
        return 'Pending';
      }

      return null;
    };
  }, [assignments, confirmedAssignments, target.unitId, assignedByDate]);

  // 전체 강사에 가용일 정보 병합 (전체 검색 탭용)
  // allAvailableInstructors에 있는 강사는 그 가용일 표시, 없으면 빈색
  const allInstructorsWithAvailability = useMemo(() => {
    const availableMap = new Map<number, string[]>();
    allAvailableInstructors.forEach((inst) => {
      if (inst.availableDates && inst.availableDates.length > 0) {
        availableMap.set(inst.id, inst.availableDates);
      }
    });

    return allInstructors.map((inst) => {
      // 기존 availableDates가 있고 비어있지 않으면 사용, 아니면 availableMap에서 가져옴
      const existingDates = inst.availableDates;
      const hasExistingDates = existingDates && existingDates.length > 0;
      return {
        ...inst,
        availableDates: hasExistingDates ? existingDates : availableMap.get(inst.id) || [],
      };
    });
  }, [allInstructors, allAvailableInstructors]);

  // 탭에 따른 강사 목록
  const instructorList =
    tab === 'AVAILABLE' ? allAvailableInstructors : allInstructorsWithAvailability;

  // 거리 가져오기 함수
  const getDistance = (instructorId: number): number | undefined => {
    if (!target.unitId) return undefined;
    const key = `${instructorId}-${target.unitId}`;
    return distanceMap[key];
  };

  // 검색 + 거리순 정렬 + target.date에 이미 배정된 강사 제외
  const filteredInstructors = useMemo(() => {
    const filtered = instructorList.filter((inst) => {
      // 검색 필터
      const matchesSearch =
        inst.name?.toLowerCase().includes(search.toLowerCase()) ||
        inst.team?.toLowerCase().includes(search.toLowerCase()) ||
        inst.teamName?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // target.date에 이미 배정된 강사는 제외
      const assignmentState = getAssignmentState(target.date, inst.id);
      if (assignmentState === 'Pending' || assignmentState === 'Accepted') {
        return false; // 이미 배정됨 - 목록에서 제외
      }

      return true;
    });

    // 거리순 정렬 (거리가 없으면 맨 뒤로)
    return filtered.sort((a, b) => {
      const keyA = `${a.id}-${target.unitId}`;
      const keyB = `${b.id}-${target.unitId}`;
      const distA = target.unitId ? distanceMap[keyA] : undefined;
      const distB = target.unitId ? distanceMap[keyB] : undefined;
      if (distA === undefined && distB === undefined) return 0;
      if (distA === undefined) return 1;
      if (distB === undefined) return -1;
      return distA - distB;
    });
  }, [instructorList, search, distanceMap, target.unitId, target.date, getAssignmentState]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearch(e.target.value);
  };

  // 개별 선택 토글
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInstructors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInstructors.map((i) => i.id)));
    }
  };

  // 선택된 강사들 일괄 추가
  const handleAddSelected = () => {
    const selected = filteredInstructors.filter((i) => selectedIds.has(i.id));
    if (selected.length > 0) {
      onAddMultiple(selected);
      setSelectedIds(new Set());
    }
  };

  // 셀 색상 결정 (임시배정 = 주황+빗금, 확정배정 = 초록+빗금)
  const getCellStyle = (
    isAvailable: boolean,
    assignmentState: 'Pending' | 'Accepted' | null,
  ): string => {
    if (assignmentState === 'Accepted') {
      return 'bg-green-500 text-white bg-stripes'; // 확정 배정
    }
    if (assignmentState === 'Pending') {
      return 'bg-orange-400 text-white bg-stripes'; // 임시 배정
    }
    if (isAvailable) {
      return 'bg-blue-200'; // 가용 가능
    }
    return 'bg-gray-50'; // 가용 불가
  };

  // 카테고리 라벨
  const getCategoryLabel = (category?: string): string | null => {
    if (category === 'Main') return '주';
    if (category === 'Co') return '부';
    if (category === 'Assistant') return '보조';
    if (category === 'Practicum') return '실습';
    return null;
  };

  // 거리 정보 가져오기 (텍스트)
  const getDistanceText = (instructorId: number): string => {
    const distKm = getDistance(instructorId);
    if (distKm !== undefined) {
      return `${distKm.toFixed(1)}km`;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      {/* 대형 팝업 본체 */}
      <div className="bg-white w-[95vw] max-w-[1600px] h-[90vh] rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base">강사 추가</h3>
            <p className="text-xs text-gray-300">{target.locationName || '교육장소'}</p>
          </div>
          <Button
            size="small"
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕ 닫기
          </Button>
        </div>

        {/* Tab + Search + 범례 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 bg-gray-50 gap-2 flex-wrap">
          <div className="flex">
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-t transition-colors ${
                tab === 'AVAILABLE'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => setTab('AVAILABLE')}
            >
              가능 강사 ({allAvailableInstructors.length})
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-t transition-colors ${
                tab === 'ALL'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => setTab('ALL')}
            >
              전체 검색 ({allInstructors.length})
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* 범례 - 타부대 제거, 임시/확정만 표시 */}
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> 가용
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-400 bg-stripes border border-orange-500" />{' '}
                임시배정
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500 bg-stripes border border-green-600" />{' '}
                확정배정
              </span>
            </div>
            <input
              type="text"
              placeholder="이름/팀명 검색..."
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-indigo-500 w-32"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Grid Table */}
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-xs table-auto">
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                {/* 체크박스 열 - 고정 너비 */}
                <th className="sticky left-0 z-20 bg-gray-200 border border-gray-300 px-2 py-2 text-center w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === filteredInstructors.length &&
                      filteredInstructors.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                    title="전체 선택"
                  />
                </th>
                {/* 이름(팀) + 거리 + 추가 버튼 열 - 체크박스 열(w-10=40px) 다음 위치 */}
                <th className="sticky left-10 z-20 bg-gray-200 border border-gray-300 px-2 py-2 text-left whitespace-nowrap">
                  <span className="text-xs">이름(팀) / 거리</span>
                </th>
                {/* 날짜 헤더 */}
                {allDates.map((date) => {
                  const weekend = isWeekend(date);
                  const isInEducationPeriod = educationDateRange
                    ? isDateInRange(date, educationDateRange)
                    : false;
                  return (
                    <th
                      key={date}
                      className={`border border-gray-300 px-1 py-1 text-center w-12 ${
                        isInEducationPeriod
                          ? 'bg-indigo-500 text-white'
                          : weekend
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <div className="text-[10px] font-bold leading-tight whitespace-nowrap">
                        {formatDateShort(date)}
                      </div>
                      <div
                        className={`text-[8px] leading-tight ${
                          isInEducationPeriod
                            ? 'text-indigo-200'
                            : weekend
                              ? 'text-red-400'
                              : 'text-gray-400'
                        }`}
                      >
                        {getDayOfWeek(date)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredInstructors.length === 0 ? (
                <tr>
                  <td colSpan={allDates.length + 2} className="text-center py-10 text-gray-400">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInstructors.map((inst) => {
                  const teamName = inst.team || inst.teamName || '';
                  const categoryLabel = getCategoryLabel(inst.category);
                  const availableDatesSet = new Set(inst.availableDates || []);
                  const isSelected = selectedIds.has(inst.id);
                  const distanceText = getDistanceText(inst.id);

                  return (
                    <tr
                      key={inst.id}
                      className={`group ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      {/* 체크박스 */}
                      <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1 text-center w-10 group-hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(inst.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {/* 이름(팀) + 거리 + 추가 버튼 - 체크박스 열(w-10=40px) 다음 위치 */}
                      <td className="sticky left-10 z-10 bg-white border border-gray-200 px-2 py-1 group-hover:bg-gray-50 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* 정보 영역 (클릭 가능) */}
                          <div
                            className="flex-1 cursor-pointer hover:text-indigo-600"
                            onClick={() => onInstructorClick?.(inst.id)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-800 text-sm">{inst.name}</span>
                              {categoryLabel && (
                                <span
                                  className={`px-1 text-[9px] font-bold rounded ${
                                    inst.category === 'Main'
                                      ? 'bg-purple-500 text-white'
                                      : inst.category === 'Co'
                                        ? 'bg-indigo-400 text-white'
                                        : inst.category === 'Assistant'
                                          ? 'bg-teal-400 text-white'
                                          : 'bg-gray-400 text-white'
                                  }`}
                                >
                                  {categoryLabel}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <span>{teamName}</span>
                              {distanceText && (
                                <span className="text-blue-600">{distanceText}</span>
                              )}
                            </div>
                          </div>
                          {/* 추가 버튼 */}
                          <button
                            onClick={() => onAddMultiple([inst])}
                            className="w-5 h-5 rounded bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors text-xs font-bold"
                            title={`${inst.name} 배정 추가`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      {/* 날짜별 셀 */}
                      {allDates.map((date) => {
                        const isAvailable = availableDatesSet.has(date);
                        const assignmentState = getAssignmentState(date, inst.id);
                        const cellStyle = getCellStyle(isAvailable, assignmentState);

                        return (
                          <td
                            key={date}
                            className={`border border-gray-200 text-center h-7 w-12 ${cellStyle}`}
                            title={
                              assignmentState === 'Accepted'
                                ? '확정 배정'
                                : assignmentState === 'Pending'
                                  ? '임시 배정'
                                  : isAvailable
                                    ? '가용 가능'
                                    : '가용 불가'
                            }
                          ></td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-4 py-2 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {filteredInstructors.length}명 표시 (총 {instructorList.length}명) / 거리순 정렬
            </span>
            {selectedIds.size > 0 && (
              <span className="text-xs text-indigo-600 font-bold">{selectedIds.size}명 선택됨</span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button onClick={handleAddSelected} variant="primary" size="small">
                선택한 {selectedIds.size}명 추가
              </Button>
            )}
            <Button onClick={onClose} variant="secondary" size="small">
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* 줄무늬 패턴 스타일 */}
      <style>{`
        .bg-stripes {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.15) 3px,
            rgba(0,0,0,0.15) 6px
          );
        }
      `}</style>
    </div>
  );
};
