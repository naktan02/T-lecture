// client/src/features/userManagement/ui/UserToolbar.tsx
import { useState, ChangeEvent, KeyboardEvent, ReactElement } from 'react';

interface SearchFilters {
  status: string;
  role: string;
  name: string;
}

interface UserToolbarProps {
  onSearch: (filters: SearchFilters) => void;
  totalCount: number;
  pendingCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '활동중' },
  { value: 'RESTING', label: '휴식중' },
  { value: 'INACTIVE', label: '비활성' },
];

const ROLE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'ADMIN', label: '관리자' },
  { value: 'INSTRUCTOR', label: '강사' },
];

export const UserToolbar = ({
  onSearch,
  totalCount,
  pendingCount = 0,
}: UserToolbarProps): ReactElement => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    status: 'ALL',
    role: '',
    name: '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (): void => {
    onSearch(filters);
    setIsFilterOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleReset = (): void => {
    const resetFilters = { status: 'ALL', role: '', name: '' };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const handleQuickFilter = (status: string): void => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* 상단: 제목 + 액션 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">유저 관리</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            총 <span className="font-bold text-green-600">{totalCount.toLocaleString()}</span>명
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600">
                (승인 대기: <span className="font-bold">{pendingCount}</span>명)
              </span>
            )}
          </p>
        </div>

        {/* 빠른 필터 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 모바일 필터 토글 */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`
              md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm
              transition-all active:scale-95
              ${
                isFilterOpen
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            필터
          </button>

          {/* 승인 대기 빠른 필터 */}
          {pendingCount > 0 && (
            <button
              onClick={() => handleQuickFilter('PENDING')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm
                transition-all active:scale-95 ${
                  filters.status === 'PENDING'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              승인 대기 ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* 데스크톱 검색 바 */}
      <div className="hidden md:flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* 상태 필터 */}
        <select
          name="status"
          value={filters.status}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm
                     focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 유형 필터 */}
        <select
          name="role"
          value={filters.role}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm
                     focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* 검색어 */}
        <div className="flex-1 min-w-[200px] relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            name="name"
            placeholder="이름, 이메일 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm
                       focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all shadow-sm"
            value={filters.name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium
                     hover:bg-green-600 active:scale-95 transition-all shadow-md shadow-green-200"
        >
          검색
        </button>

        {/* 초기화 */}
        {(filters.name || filters.status !== 'ALL' || filters.role) && (
          <button
            onClick={handleReset}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors hover:bg-gray-50 rounded-lg"
          >
            초기화
          </button>
        )}
      </div>

      {/* 모바일 검색 패널 */}
      {isFilterOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* 상태 필터 */}
          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* 유형 필터 */}
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* 검색어 */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              name="name"
              placeholder="검색어 입력..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none"
              value={filters.name}
              onChange={handleChange}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              초기화
            </button>
            <button
              onClick={handleSearch}
              className="flex-1 py-3 bg-green-500 text-white rounded-lg text-sm font-medium"
            >
              검색
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
