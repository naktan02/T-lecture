import React from 'react';

export const UnitList = ({ units, selectedIds = [], onToggleSelect, onToggleAll, onUnitClick }) => {
  // ✅ 데이터 방어 로직 (렌더링 에러 방지 2차)
  if (!Array.isArray(units) || units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl h-full text-gray-500">
        <div className="text-4xl mb-4">📭</div>
        <p>등록된 부대가 없습니다.</p>
      </div>
    );
  }

  const isAllSelected = units.length > 0 && units.every(u => selectedIds.includes(u.id));

  return (
    <div className="h-full overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr className="text-xs uppercase text-gray-500 font-semibold border-b">
            {/* ✅ 전체 선택 체크박스 */}
            <th className="px-6 py-4 w-12">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-4">부대명 / 구분</th>
            <th className="px-6 py-4">위치 (지역)</th>
            <th className="px-6 py-4">담당자</th>
            <th className="px-6 py-4 text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {units.map((unit) => (
            <tr key={unit.id} className="hover:bg-blue-50 transition-colors group">
              {/* ✅ 개별 선택 체크박스 */}
              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(unit.id)}
                  onChange={() => onToggleSelect(unit.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </td>
              
              {/* 클릭 시 상세 이동 */}
              <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick(unit)}>
                <div className="font-bold text-gray-900 group-hover:text-blue-600">{unit.name}</div>
                <div className="text-xs text-gray-500">{unit.unitType}</div>
              </td>
              <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick(unit)}>
                <div>{unit.wideArea} {unit.region}</div>
                <div className="text-xs text-gray-400 truncate max-w-[200px]">{unit.addressDetail || '-'}</div>
              </td>
              <td className="px-6 py-4 cursor-pointer" onClick={() => onUnitClick(unit)}>
                {unit.officerName || <span className="text-gray-300">-</span>}
              </td>
              <td className="px-6 py-4 text-right cursor-pointer text-gray-400" onClick={() => onUnitClick(unit)}>
                &gt;
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};