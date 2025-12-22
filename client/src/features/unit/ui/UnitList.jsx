import React from 'react';

export const UnitList = ({ 
  units = [],            // 기본값 빈 배열 설정 (에러 방지)
  selectedIds = [],      // 선택된 ID 목록
  onToggleSelect,        // 개별 선택 토글 함수
  onToggleAll,           // 전체 선택 토글 함수
  onUnitClick            // 상세 보기 클릭 함수
}) => {
  // 1. 데이터가 없을 경우 표시할 UI (렌더링 에러 방지)
  if (!units || !Array.isArray(units) || units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 bg-white rounded-xl border border-gray-200">
        <div className="text-4xl mb-2">📭</div>
        <p>등록된 부대 데이터가 없습니다.</p>
      </div>
    );
  }

  // 2. 전체 선택 여부 계산
  const isAllSelected = units.length > 0 && units.every(u => selectedIds.includes(u.id));

  return (
    <div className="h-full overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 relative">
      <table className="w-full text-left border-collapse">
        {/* 헤더 고정 (Sticky Header) */}
        <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr className="text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
            {/* ✅ [추가] 전체 선택 체크박스 */}
            <th className="px-6 py-4 w-12 text-center bg-gray-50">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={(e) => onToggleAll && onToggleAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th className="px-6 py-4 bg-gray-50">부대명 / 구분</th>
            <th className="px-6 py-4 bg-gray-50">위치 (지역)</th>
            <th className="px-6 py-4 bg-gray-50">담당자</th>
            <th className="px-6 py-4 bg-gray-50 text-right">관리</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {units.map((unit) => {
            const isSelected = selectedIds.includes(unit.id);
            
            return (
              <tr 
                key={unit.id} 
                className={`transition-colors group ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
              >
                {/* ✅ [추가] 개별 선택 체크박스 */}
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(unit.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>

                {/* 클릭 시 상세 이동 (이름 영역) */}
                <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick && onUnitClick(unit)}>
                  <div className={`font-bold ${isSelected ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>
                    {unit.name}
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">
                    {unit.unitType}
                  </div>
                </td>

                {/* 위치 정보 */}
                <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick && onUnitClick(unit)}>
                  <div className="text-sm text-gray-800">{unit.wideArea} {unit.region}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[200px]" title={unit.addressDetail}>
                    {unit.addressDetail || '-'}
                  </div>
                </td>

                {/* 담당자 정보 */}
                <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick && onUnitClick(unit)}>
                  {unit.officerName ? (
                    <div>
                      <div className="text-sm font-medium">{unit.officerName}</div>
                      <div className="text-xs text-gray-400">{unit.officerPhone}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded">미지정</span>
                  )}
                </td>

                {/* 관리 버튼 */}
                <td className="px-6 py-4 text-right cursor-pointer" onClick={() => onUnitClick && onUnitClick(unit)}>
                  <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-lg">
                    &gt;
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};