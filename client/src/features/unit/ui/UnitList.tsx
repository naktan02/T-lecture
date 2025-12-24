// client/src/features/unit/ui/UnitList.tsx
import React, { ReactElement, ChangeEvent } from 'react';
import { EmptyState } from '../../../shared/ui';

interface Unit {
  id: number;
  name: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  officerName?: string;
  officerPhone?: string;
  educationStart?: string;
  educationEnd?: string;
  [key: string]: unknown;
}

interface UnitListProps {
  units?: Unit[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleAll?: (isChecked: boolean) => void;
  onUnitClick?: (unit: Unit) => void;
}

// 날짜 포맷팅 헬퍼
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const UnitList = ({
  units = [],
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  onUnitClick,
}: UnitListProps): ReactElement => {
  // 1. 데이터가 없을 경우
  if (!units || !Array.isArray(units) || units.length === 0) {
    return (
      <EmptyState
        icon="🏢"
        title="등록된 부대가 없습니다"
        description="새로운 부대를 등록하거나 엑셀 파일을 업로드하세요."
      />
    );
  }

  // 2. 전체 선택 여부 계산
  const isAllSelected = units.length > 0 && units.every((u) => selectedIds.includes(u.id));

  const handleToggleAll = (e: ChangeEvent<HTMLInputElement>): void => {
    onToggleAll?.(e.target.checked);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
              <th className="px-4 py-3 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">부대명</th>
              <th className="px-4 py-3">위치</th>
              <th className="px-4 py-3">교육기간</th>
              <th className="px-4 py-3">담당자</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {units.map((unit) => {
              const isSelected = selectedIds.includes(unit.id);

              return (
                <tr
                  key={unit.id}
                  className={`
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => onUnitClick?.(unit)}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(unit.id)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{unit.name}</div>
                    <span
                      className={`
                      inline-block text-xs px-2 py-0.5 rounded-full mt-1
                      ${
                        unit.unitType === 'Army'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }
                    `}
                    >
                      {unit.unitType === 'Army' ? '육군' : '해군'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">
                      {unit.wideArea} {unit.region}
                    </div>
                    <div
                      className="text-xs text-gray-400 truncate max-w-[180px]"
                      title={unit.addressDetail}
                    >
                      {unit.addressDetail || '-'}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      {formatDate(unit.educationStart)} ~ {formatDate(unit.educationEnd)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {unit.officerName ? (
                      <div>
                        <div className="text-sm font-medium">{unit.officerName}</div>
                        <div className="text-xs text-gray-400">{unit.officerPhone}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">미지정</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden p-3 space-y-3">
        {/* 모바일 전체 선택 */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleToggleAll}
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-600">전체 선택</span>
          <span className="text-xs text-gray-400 ml-auto">{units.length}개</span>
        </div>

        {units.map((unit) => {
          const isSelected = selectedIds.includes(unit.id);

          return (
            <div
              key={unit.id}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? 'border-green-400 bg-green-50/50 shadow-sm'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }
              `}
              onClick={() => onUnitClick?.(unit)}
            >
              {/* 체크박스 */}
              <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(unit.id)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </div>

              {/* 콘텐츠 */}
              <div className="ml-8">
                {/* 상단: 부대명 + 타입 */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{unit.name}</h3>
                    <span
                      className={`
                      inline-block text-xs px-2 py-0.5 rounded-full mt-1
                      ${
                        unit.unitType === 'Army'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }
                    `}
                    >
                      {unit.unitType === 'Army' ? '육군' : '해군'}
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>

                {/* 정보 그리드 */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="text-base">📍</span>
                    <span className="truncate">
                      {unit.wideArea} {unit.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="text-base">📅</span>
                    <span>
                      {formatDate(unit.educationStart)} ~ {formatDate(unit.educationEnd)}
                    </span>
                  </div>
                  {unit.officerName && (
                    <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                      <span className="text-base">👤</span>
                      <span>{unit.officerName}</span>
                      <span className="text-gray-400">{unit.officerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
