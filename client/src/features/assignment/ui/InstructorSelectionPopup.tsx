// src/features/assignment/ui/InstructorSelectionPopup.tsx
import { useState, ChangeEvent } from 'react';
import { Button } from '../../../shared/ui/Button';

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
  onClose: () => void;
  onAdd?: (instructor: Instructor) => void;
}

type TabType = 'AVAILABLE' | 'ALL';

export const InstructorSelectionPopup: React.FC<InstructorSelectionPopupProps> = ({
  target,
  onClose,
  onAdd: _onAdd,
}) => {
  const [tab, setTab] = useState<TabType>('AVAILABLE');
  const [search, setSearch] = useState<string>('');

  // TODO: 실제 데이터는 useAssignment나 API에서 가져와야 함 (여기선 더미)
  const availableInstructors: Instructor[] = [
    { id: 1, name: '김철수', team: '교육1팀' },
    { id: 2, name: '이영희', team: '교육2팀' },
  ];
  const allInstructors: Instructor[] = [
    ...availableInstructors,
    { id: 3, name: '박민수', team: '교육3팀' },
  ];

  const list = tab === 'AVAILABLE' ? availableInstructors : allInstructors;
  const filteredList = list.filter((i) => i.name.includes(search));

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearch(e.target.value);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-transparent">
      {/* 팝업 본체 */}
      <div className="bg-white w-[400px] rounded-lg shadow-2xl border border-gray-300 flex flex-col overflow-hidden animate-fadeInScale">
        <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
          <h3 className="font-bold text-sm">강사 추가 ({target.date})</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-2 text-sm font-bold ${tab === 'AVAILABLE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('AVAILABLE')}
          >
            가능 강사
          </button>
          <button
            className={`flex-1 py-2 text-sm font-bold ${tab === 'ALL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setTab('ALL')}
          >
            전체 검색
          </button>
        </div>

        {/* 검색 & 리스트 */}
        <div className="p-4 flex-1 flex flex-col h-[300px]">
          <div className="mb-2">
            <input
              type="text"
              placeholder="강사명 검색..."
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-indigo-500"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredList.map((inst) => (
              <div
                key={inst.id}
                className="flex justify-between items-center p-2 hover:bg-indigo-50 rounded cursor-pointer group border border-transparent hover:border-indigo-100"
              >
                <div>
                  <div className="text-sm font-bold text-gray-800">{inst.name}</div>
                  <div className="text-xs text-gray-500">{inst.team}</div>
                </div>
                <Button
                  size="xsmall"
                  variant="outline"
                  onClick={() => {
                    alert(`${inst.name} 강사를 추가합니다.`);
                    onClose();
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
