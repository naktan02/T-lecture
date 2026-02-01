// src/features/assignment/ui/InstructorSelectionPopup.tsx
import { useState, ChangeEvent, useMemo } from 'react';
import { Button } from '../../../shared/ui';

interface Target {
  date: string;
  unitId?: number; // 부대 ID (거리 필터링용)
}

interface Instructor {
  id: number;
  name: string;
  team: string;
}

interface InstructorSelectionPopupProps {
  target: Target;
  allAvailableInstructors: any[]; // 기간 내 가용일 있는 강사
  allInstructors?: any[]; // 전체 승인된 강사 (전체 검색용)
  assignedInstructorIds?: number[]; // 이미 해당 날짜에 배정된 강사 ID
  // 거리 필터링용 데이터
  distanceMap?: Record<string, number>; // `${instructorId}-${unitId}` → km
  distanceLimits?: {
    internMaxDistanceKm: number;
    subMaxDistanceKm: number | null;
  } | null;
  onClose: () => void;
  onAdd?: (instructor: Instructor) => Promise<void>;
  onBlock?: () => Promise<void>; // 배정 막기 콜백
  onInstructorClick?: (instructorId: number) => void; // 강사 상세보기 클릭
}

type TabType = 'AVAILABLE' | 'ALL';

export const InstructorSelectionPopup: React.FC<InstructorSelectionPopupProps> = ({
  target,
  allAvailableInstructors = [],
  allInstructors = [],
  assignedInstructorIds = [],
  distanceMap = {},
  distanceLimits = null,
  onClose,
  onAdd,
  onBlock,
  onInstructorClick,
}) => {
  const [tab, setTab] = useState<TabType>('AVAILABLE');
  const [search, setSearch] = useState<string>('');

  // 거리 필터 함수: category별 제한 거리 적용
  // 거리 데이터가 없는 강사는 통과 (사용자 요청: 그대로 보여주기)
  const isWithinDistanceLimit = useMemo(() => {
    return (inst: any): boolean => {
      // 거리 제한 설정이 없으면 통과
      if (!distanceLimits || !target.unitId) return true;

      // Main, Co는 거리 제한 없음
      if (inst.category === 'Main' || inst.category === 'Co') return true;

      const key = `${inst.id}-${target.unitId}`;
      const distanceKm = distanceMap[key];

      // 거리 데이터가 없으면 통과 (사용자 요청: 그대로 보여주기)
      if (distanceKm === undefined) return true;

      // Practicum: 실습강사 거리 제한
      if (inst.category === 'Practicum') {
        return distanceKm <= distanceLimits.internMaxDistanceKm;
      }

      // Assistant: 보조강사 거리 제한 (null = 제한 없음)
      if (inst.category === 'Assistant') {
        if (distanceLimits.subMaxDistanceKm === null) return true;
        return distanceKm <= distanceLimits.subMaxDistanceKm;
      }

      // 기타 category는 통과
      return true;
    };
  }, [distanceMap, distanceLimits, target.unitId]);

  // 가능 강사 탭: 기간 내 가용일 있는 강사 중 해당 날짜에 가용 + 미배정 + 거리 제한 통과
  const periodInstructors = allAvailableInstructors || [];
  const notAssignedPeriod = periodInstructors.filter(
    (inst) => !assignedInstructorIds.includes(inst.id),
  );
  const availableForDate = notAssignedPeriod
    .filter((inst) => inst.availableDates?.includes(target.date))
    .filter(isWithinDistanceLimit); // 거리 필터 적용

  // 전체 검색 탭: 모든 승인된 강사 중 해당 날짜에 미배정 (거리 필터 미적용)
  const allInst = allInstructors || [];
  const notAssignedAll = allInst.filter((inst) => !assignedInstructorIds.includes(inst.id));

  const list = tab === 'AVAILABLE' ? availableForDate : notAssignedAll;
  // 이름 또는 팀명으로 검색
  const filteredList = list.filter(
    (i) =>
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.team?.toLowerCase().includes(search.toLowerCase()) ||
      i.teamName?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearch(e.target.value);
  };

  const handleSelectInstructor = async (inst: Instructor) => {
    if (!onAdd) return;
    await onAdd(inst);
    onClose();
  };

  const handleBlockAssignment = async () => {
    if (!onBlock) return;
    await onBlock();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      {/* 팝업 본체 */}
      <div className="bg-white w-full max-w-[420px] max-h-[80vh] rounded-lg shadow-2xl border border-gray-300 flex flex-col overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
          <h3 className="font-bold text-sm">강사 추가 ({target.date})</h3>
          <Button
            size="xsmall"
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          <Button
            variant="ghost"
            className={`flex-1 py-2 text-sm font-bold rounded-none ${tab === 'AVAILABLE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('AVAILABLE')}
          >
            가능 강사
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-2 text-sm font-bold rounded-none ${tab === 'ALL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('ALL')}
          >
            전체 검색
          </Button>
        </div>

        {/* 검색 & 리스트 */}
        <div className="p-4 flex-1 flex flex-col min-h-0">
          <div className="mb-2">
            <input
              type="text"
              placeholder="강사명 또는 팀명 검색..."
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-indigo-500"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
            {/* 배정 막기 옵션 (제일 상단) */}
            {onBlock && (
              <div className="flex justify-between items-center p-2 bg-red-50 hover:bg-red-100 rounded cursor-pointer group border border-red-200 mb-2">
                <div>
                  <div className="text-sm font-bold text-red-700">🚫 추가 배정 막기</div>
                  <div className="text-xs text-red-500">이 슬롯에 더 이상 배정하지 않음</div>
                </div>
                <Button
                  size="xsmall"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-100"
                  onClick={handleBlockAssignment}
                >
                  선택
                </Button>
              </div>
            )}

            {filteredList.map((inst) => {
              // 거리 계산
              const distanceKey = target.unitId ? `${inst.id}-${target.unitId}` : null;
              const distanceKm = distanceKey ? distanceMap[distanceKey] : undefined;
              const distanceText =
                distanceKm !== undefined ? `${distanceKm.toFixed(1)}km` : '거리없음';

              // 직책 라벨
              const categoryLabel =
                inst.category === 'Main'
                  ? '주'
                  : inst.category === 'Co'
                    ? '부'
                    : inst.category === 'Assistant'
                      ? '보조'
                      : inst.category === 'Practicum'
                        ? '실습'
                        : null;

              return (
                <div
                  key={inst.id}
                  className="flex justify-between items-center p-2 hover:bg-indigo-50 rounded cursor-pointer group border border-transparent hover:border-indigo-100"
                  onClick={() => onInstructorClick?.(inst.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-800 truncate">{inst.name}</span>
                      {categoryLabel && (
                        <span
                          className={`px-1 py-0.5 text-[9px] font-bold rounded flex-shrink-0 ${
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
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{inst.team || inst.teamName}</span>
                      <span
                        className={`flex-shrink-0 ${distanceKm !== undefined ? 'text-blue-600' : 'text-gray-400'}`}
                      >
                        📍 {distanceText}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="xsmall"
                    variant="outline"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation(); // 행 클릭 이벤트 전파 방지
                      handleSelectInstructor(inst);
                    }}
                  >
                    선택
                  </Button>
                </div>
              );
            })}
            {filteredList.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-10">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
