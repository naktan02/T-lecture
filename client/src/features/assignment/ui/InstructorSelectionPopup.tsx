// src/features/assignment/ui/InstructorSelectionPopup.tsx
import { useState, ChangeEvent } from 'react';
import { Button } from '../../../shared/ui';

interface Target {
  date: string;
}

interface Instructor {
  id: number;
  name: string;
  team: string;
}

interface InstructorSelectionPopupProps {
  target: Target;
  allAvailableInstructors: any[];
  onClose: () => void;
  onAdd?: (instructor: Instructor) => Promise<void>;
  onBlock?: () => Promise<void>; // 배정 막기 콜백
}

type TabType = 'AVAILABLE' | 'ALL';

export const InstructorSelectionPopup: React.FC<InstructorSelectionPopupProps> = ({
  target,
  allAvailableInstructors = [],
  onClose,
  onAdd,
  onBlock,
}) => {
  const [tab, setTab] = useState<TabType>('AVAILABLE');
  const [search, setSearch] = useState<string>('');

  const instructors = allAvailableInstructors || [];
  const availableForDate = instructors.filter((inst) => inst.availableDates?.includes(target.date));

  const list = tab === 'AVAILABLE' ? availableForDate : instructors;
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

            {filteredList.map((inst) => (
              <div
                key={inst.id}
                className="flex justify-between items-center p-2 hover:bg-indigo-50 rounded cursor-pointer group border border-transparent hover:border-indigo-100"
              >
                <div>
                  <div className="text-sm font-bold text-gray-800">{inst.name}</div>
                  <div className="text-xs text-gray-500">{inst.team || inst.teamName}</div>
                </div>
                <Button
                  size="xsmall"
                  variant="outline"
                  onClick={() => {
                    handleSelectInstructor(inst);
                  }}
                >
                  선택
                </Button>
              </div>
            ))}
            {filteredList.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-10">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
