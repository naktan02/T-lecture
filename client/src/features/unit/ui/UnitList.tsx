// client/src/features/unit/ui/UnitList.tsx
import { ReactElement, ChangeEvent } from 'react';
import { EmptyState } from '../../../shared/ui';
import {
  Unit,
  TrainingPeriod,
  getPeriodDateRange,
  getMilitaryTypeLabel,
} from '../../../shared/types/unit.types';

interface UnitListProps {
  units?: Unit[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleAll?: (isChecked: boolean) => void;
  onUnitClick?: (unit: Unit) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

// 날짜 포맷팅 헬퍼 (M/D 형식)
const formatDateMD = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 군 타입 정보 (색상 매핑)
const getUnitTypeColor = (unitType?: string | null): { bgColor: string; textColor: string } => {
  switch (unitType) {
    case 'Army':
      return { bgColor: 'bg-green-100', textColor: 'text-green-700' };
    case 'Navy':
      return { bgColor: 'bg-blue-100', textColor: 'text-blue-700' };
    case 'AirForce':
      return { bgColor: 'bg-sky-100', textColor: 'text-sky-700' };
    case 'Marines':
      return { bgColor: 'bg-red-100', textColor: 'text-red-700' };
    case 'MND':
      return { bgColor: 'bg-purple-100', textColor: 'text-purple-700' };
    default:
      return { bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
  }
};

// 교육기간 표시 (trainingPeriods에서 날짜 추출)
const renderEducationPeriods = (periods?: TrainingPeriod[]): ReactElement => {
  if (!periods || periods.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="space-y-1">
      {periods.map((period, idx) => {
        const { start, end } = getPeriodDateRange(period);
        const startStr = formatDateMD(start);
        const endStr = formatDateMD(end);
        return (
          <div key={period.id || idx} className="text-sm">
            <span className="text-gray-500">{period.name}:</span>{' '}
            <span className="text-gray-700">
              {startStr} ~ {endStr}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const getLocationCount = (period?: TrainingPeriod): number => {
  if (!period) return 0;
  if (typeof period.locationCount === 'number') return period.locationCount;
  return period.locations?.length || 0;
};

type UnitWarning = {
  message: string;
  tone: 'error' | 'warning';
};

const getUnitWarning = (unit: Unit): UnitWarning | null => {
  if (unit.validationStatus === 'Invalid') {
    const validationMessage = unit.validationMessage || '알 수 없는 오류';
    return {
      message: `[데이터 오류] ${validationMessage}`,
      tone: validationMessage.includes('교육장소') ? 'warning' : 'error',
    };
  }
  if (!unit.addressDetail) {
    return { message: '주소가 입력되지 않았습니다.', tone: 'error' };
  }
  if (unit.lat === null) {
    return { message: '주소 좌표를 찾을 수 없습니다. 주소를 확인해주세요.', tone: 'error' };
  }
  if (!unit.trainingPeriods || unit.trainingPeriods.length === 0) {
    return { message: '교육기간이 없습니다.', tone: 'warning' };
  }
  if (getLocationCount(unit.trainingPeriods[0]) === 0) {
    return { message: '교육장소가 없습니다.', tone: 'warning' };
  }
  return null;
};

const WarningIcon = ({ warning, className = '' }: { warning: UnitWarning; className?: string }) => (
  <span title={warning.message} aria-label={warning.message} className={className}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-4 h-4 ${warning.tone === 'error' ? 'text-red-500' : 'text-amber-500'}`}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);

export const UnitList = ({
  units = [],
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  onUnitClick,
  sortField,
  sortOrder,
  onSort,
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

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    return sortOrder === 'asc' ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
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
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('name')}
              >
                부대명 {getSortIcon('name')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('region')}
              >
                위치 {getSortIcon('region')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('educationStart')}
              >
                교육기간 {getSortIcon('educationStart')}
              </th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {units.map((unit) => {
              const isSelected = selectedIds.includes(unit.id);
              const unitWarning = getUnitWarning(unit);

              return (
                <tr
                  key={unit.id}
                  className={`
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}
                    ${unitWarning?.tone === 'error' ? 'bg-red-50' : ''}
                    ${unitWarning?.tone === 'warning' ? 'bg-amber-50' : ''}
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
                    <div className="font-semibold text-gray-900 flex items-center gap-1">
                      {unit.name}
                      {/* 주소/데이터/교육기간/장소 오류 경고 아이콘 */}
                      {unitWarning && <WarningIcon warning={unitWarning} />}
                    </div>
                    {(() => {
                      const colors = getUnitTypeColor(unit.unitType);
                      return (
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${colors.bgColor} ${colors.textColor}`}
                        >
                          {getMilitaryTypeLabel(unit.unitType)}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">
                      {unit.wideArea} {unit.region}
                    </div>
                    <div
                      className="text-xs text-gray-400 truncate max-w-[180px]"
                      title={unit.addressDetail || ''}
                    >
                      {unit.addressDetail || '-'}
                    </div>
                  </td>

                  <td className="px-4 py-3">{renderEducationPeriods(unit.trainingPeriods)}</td>

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
          const unitWarning = getUnitWarning(unit);
          const firstPeriod = unit.trainingPeriods?.[0];
          const { start, end } = firstPeriod
            ? getPeriodDateRange(firstPeriod)
            : { start: null, end: null };

          return (
            <div
              key={unit.id}
              className={`
                relative p-3.5 rounded-xl border-2 transition-all duration-200
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">
                        {unit.name}
                      </h3>
                      {unitWarning && <WarningIcon warning={unitWarning} className="shrink-0" />}
                    </div>
                    {(() => {
                      const colors = getUnitTypeColor(unit.unitType);
                      return (
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${colors.bgColor} ${colors.textColor}`}
                        >
                          {getMilitaryTypeLabel(unit.unitType)}
                        </span>
                      );
                    })()}
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
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
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] md:text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="text-sm">📍</span>
                    <span className="truncate">
                      {unit.wideArea} {unit.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <span className="text-sm">📅</span>
                    <span className="truncate">
                      {formatDateMD(start)} ~ {formatDateMD(end)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
