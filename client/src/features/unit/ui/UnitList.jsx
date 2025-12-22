import React from 'react';

// 군별 색상/아이콘 헬퍼
const getUnitBadgeStyle = (type) => {
  switch (type) {
    case '육군': return 'bg-green-100 text-green-700 border-green-200';
    case '해군': return 'bg-blue-100 text-blue-700 border-blue-200';
    case '공군': return 'bg-sky-100 text-sky-700 border-sky-200';
    case '해병대': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const UnitList = ({ units, onUnitClick }) => {
  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-500 font-medium">등록된 부대가 없습니다.</p>
        <p className="text-sm text-gray-400">신규 등록이나 엑셀 업로드를 진행해주세요.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* 🖥️ Desktop View (Table) */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse relative">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
              <th className="px-6 py-4">부대명 / 구분</th>
              <th className="px-6 py-4">위치 (지역)</th>
              <th className="px-6 py-4">담당자</th>
              <th className="px-6 py-4">최근 활동</th>
              <th className="px-6 py-4 text-right">관리</th>
            </tr>
          </thead >
          <tbody className="divide-y divide-gray-100">
            {units.map((unit) => (
              <tr key={unit.id} onClick={() => onUnitClick(unit)} className="hover:bg-gray-50 cursor-pointer">
                {/* 부대명 & 뱃지 */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border ${getUnitBadgeStyle(unit.unitType).split(' ')[2]}`}>
                       {/* 군별 이모지 매핑 */}
                       {unit.unitType === '공군' ? '✈️' : unit.unitType === '해군' ? '⚓' : '🎖️'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {unit.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getUnitBadgeStyle(unit.unitType)}`}>
                        {unit.unitType}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 지역 */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700 font-medium">{unit.wideArea} {unit.region}</div>
                  <div className="text-xs text-gray-400 truncate max-w-[200px]">{unit.address || '주소 미입력'}</div>
                </td>

                {/* 담당자 */}
                <td className="px-6 py-4">
                  {unit.officerName ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">{unit.officerName}</span>
                      <span className="text-xs text-gray-400">{unit.officerPhone}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 bg-gray-50 px-2 py-1 rounded-full">미지정</span>
                  )}
                </td>

                {/* 최근 활동 (일정) */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${unit.schedules?.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">
                      {unit.schedules?.[0] ? `${unit.schedules[0].date} 교육` : '예정 없음'}
                    </span>
                  </div>
                </td>

                {/* 화살표 아이콘 */}
                <td className="px-6 py-4 text-right text-gray-400 group-hover:text-blue-500 transition-colors">
                  <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📱 Mobile View (Cards) */}
      <div className="md:hidden flex flex-col divide-y divide-gray-100">
        {units.map((unit) => (
          <div 
            key={unit.id} 
            className="p-5 active:bg-gray-50 cursor-pointer"
            onClick={() => onUnitClick(unit)}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-xs font-bold border ${getUnitBadgeStyle(unit.unitType)}`}>
                {unit.unitType}
              </span>
              <span className="text-xs text-gray-400">상세보기 &gt;</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{unit.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{unit.wideArea} {unit.region} {unit.address}</p>
            
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-1">
                <span>👤</span>
                <span>{unit.officerName || '-'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📞</span>
                <span>{unit.officerPhone || '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};