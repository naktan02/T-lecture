// client/src/features/unit/ui/LocationAccordion.tsx
// 교육장소 아코디언 컴포넌트 - 접기/펼치기 기능

import { useState, ChangeEvent } from 'react';
import { showConfirm } from '../../../shared/utils/toast';

export interface LocationData {
  id?: number;
  originalPlace: string;
  changedPlace?: string;
  hasInstructorLounge: boolean;
  hasWomenRestroom: boolean;
  note: string;
  hasAssignments?: boolean;
}

interface LocationAccordionProps {
  locations: LocationData[];
  onUpdate: (
    index: number,
    field: keyof LocationData,
    value: LocationData[keyof LocationData],
  ) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  readOnly?: boolean;
}

export const LocationAccordion = ({
  locations,
  onUpdate,
  onRemove,
  onAdd,
  readOnly = false,
}: LocationAccordionProps) => {
  // 각 장소의 펼침 상태 관리
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleChange = (
    index: number,
    field: keyof LocationData,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    let value: string | boolean;
    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else {
      value = target.value;
    }
    onUpdate(index, field, value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">교육장소</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            + 장소 추가
          </button>
        )}
      </div>

      {locations.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">등록된 교육장소가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc, index) => {
            const isExpanded = expandedIndices.has(index);
            // 변경장소가 있으면 변경장소, 없으면 원래장소 표시
            const displayName = loc.changedPlace || loc.originalPlace || `장소 ${index + 1}`;

            return (
              <div
                key={loc.id || `loc-${index}`}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* 헤더 (클릭하면 펼침/접힘) */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                    <span className="font-medium text-gray-800">{displayName}</span>
                    <div className="flex gap-1 text-xs">
                      {loc.hasInstructorLounge && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          휴게실
                        </span>
                      )}
                      {loc.hasWomenRestroom && (
                        <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded">
                          여자 화장실
                        </span>
                      )}
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // 배정이 있으면 확인, 없으면 바로 삭제
                        if (loc.hasAssignments) {
                          const confirmed = await showConfirm(
                            `"${loc.originalPlace || '장소 ' + (index + 1)}"에 배정이 존재합니다. 삭제하시겠습니까?`,
                          );
                          if (confirmed) {
                            onRemove(index);
                          }
                        } else {
                          onRemove(index);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>

                {/* 펼쳐진 내용 */}
                {isExpanded && (
                  <div className="px-4 py-3 space-y-3 bg-white">
                    {/* 장소명 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">원래 장소</label>
                        <input
                          type="text"
                          value={loc.originalPlace}
                          onChange={(e) => handleChange(index, 'originalPlace', e)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                          placeholder="예: 본관 강당"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변경 장소</label>
                        <input
                          type="text"
                          value={loc.changedPlace || ''}
                          onChange={(e) => handleChange(index, 'changedPlace', e)}
                          disabled={readOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                          placeholder="변경된 경우 입력"
                        />
                      </div>
                    </div>

                    {/* 시설 체크박스 */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loc.hasInstructorLounge}
                          onChange={(e) => handleChange(index, 'hasInstructorLounge', e)}
                          disabled={readOnly}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span>강사 휴게실</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loc.hasWomenRestroom}
                          onChange={(e) => handleChange(index, 'hasWomenRestroom', e)}
                          disabled={readOnly}
                          className="w-4 h-4 text-pink-600 rounded"
                        />
                        <span>여자 화장실</span>
                      </label>
                    </div>

                    {/* 특이사항 */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">특이사항</label>
                      <textarea
                        value={loc.note}
                        onChange={(e) => handleChange(index, 'note', e)}
                        disabled={readOnly}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 resize-none"
                        placeholder="특이사항 입력"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
