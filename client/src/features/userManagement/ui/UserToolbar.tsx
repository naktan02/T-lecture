// client/src/features/userManagement/ui/UserToolbar.tsx
import { useState, ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeams, Team } from '../../settings/settingsApi';

interface SearchFilters {
  status: string;
  role: string;
  name: string;
  teamId: string;
  category: string;
  availableFrom: string;
  availableTo: string;
  profileIncomplete: boolean;
}

interface UserToolbarProps {
  onSearch: (filters: SearchFilters) => void;
  totalCount: number;
  pendingCount?: number;
  onShowTutorial?: () => void;
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
  { value: 'NORMAL', label: '예비강사' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: '전체 분류' },
  { value: 'Main', label: '주강사' },
  { value: 'Co', label: '보조강사' },
  { value: 'Assistant', label: '부강사' },
  { value: 'Practicum', label: '실습' },
];

const INITIAL_FILTERS: SearchFilters = {
  status: 'ALL',
  role: '',
  name: '',
  teamId: '',
  category: '',
  availableFrom: '',
  availableTo: '',
  profileIncomplete: false,
};

export const UserToolbar = ({
  onSearch,
  totalCount,
  pendingCount = 0,
  onShowTutorial,
}: UserToolbarProps): ReactElement => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);

  // 팀 목록 조회
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 5 * 60 * 1000,
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
    setFilters(INITIAL_FILTERS);
    onSearch(INITIAL_FILTERS);
  };

  const handleQuickFilter = (key: keyof SearchFilters, value: string): void => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  // 활성 필터 개수 계산
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'status') return value !== 'ALL';
    if (key === 'name') return false; // 검색어는 제외
    if (key === 'profileIncomplete') return value === true;
    return value !== '';
  }).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 상단 헤더 */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">유저 관리</h2>
          {onShowTutorial && (
            <button
              onClick={onShowTutorial}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-sm"
              title="유저 관리 사용법 보기"
            >
              <span className="text-sm">💡</span> 사용법 보기
            </button>
          )}
        </div>
        <div>
          <p className="text-[10px] md:text-sm text-gray-500 mt-0.5">
            총 <span className="font-bold text-green-600">{totalCount.toLocaleString()}</span>명
            {pendingCount > 0 && (
              <span className="ml-1 md:ml-2 text-amber-600">
                (대기: <span className="font-bold">{pendingCount}</span>)
              </span>
            )}
          </p>
        </div>

        {/* 빠른 필터 + 검색 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 승인 대기 빠른 필터 */}
          {pendingCount > 0 && (
            <button
              onClick={() =>
                handleQuickFilter('status', filters.status === 'PENDING' ? 'ALL' : 'PENDING')
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
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

          {/* 필터 토글 버튼 */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
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
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 확장 필터 패널 */}
      {isFilterOpen && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
          {/* 검색어 입력 */}
          {/* 검색어 입력 */}
          <div>
            <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
              검색어
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400"
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
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={filters.name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {/* 필터 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 상태 */}
            <div>
              <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
                상태
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="w-full px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 유형 */}
            <div>
              <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
                유형
              </label>
              <select
                name="role"
                value={filters.role}
                onChange={handleChange}
                className="w-full px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 분류 (카테고리) */}
            <div>
              <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
                분류
              </label>
              <select
                name="category"
                value={filters.category}
                onChange={handleChange}
                className="w-full px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 소속 팀 */}
            <div>
              <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
                소속 팀
              </label>
              <select
                name="teamId"
                value={filters.teamId}
                onChange={handleChange}
                className="w-full px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">전체 팀</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id.toString()}>
                    {team.name || `팀 ${team.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 근무 가능 기간 */}
            <div className="col-span-2">
              <label className="text-[10px] md:text-xs font-medium text-gray-600 mb-1 block">
                근무 가능 기간
              </label>
              <div className="flex gap-1.5 md:gap-2 items-center">
                <input
                  type="date"
                  name="availableFrom"
                  value={filters.availableFrom}
                  onChange={handleChange}
                  max="2099-12-31"
                  className="flex-1 px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500 min-w-0"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  name="availableTo"
                  value={filters.availableTo}
                  onChange={handleChange}
                  max="2099-12-31"
                  className="flex-1 px-2 md:px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm bg-white outline-none focus:ring-2 focus:ring-green-500 min-w-0"
                />
              </div>
            </div>

            {/* 정보 입력 미완료 */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer mt-1 md:mt-2">
                <input
                  type="checkbox"
                  name="profileIncomplete"
                  checked={filters.profileIncomplete}
                  onChange={(e) => setFilters({ ...filters, profileIncomplete: e.target.checked })}
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-xs md:text-sm text-gray-700">
                  📝 정보 입력 미완료 강사만 보기
                </span>
              </label>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              초기화
            </button>
            <button
              onClick={handleSearch}
              className="px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 active:scale-95 transition-all shadow-md shadow-green-200"
            >
              검색
            </button>
          </div>
        </div>
      )}

      {/* 활성 필터 태그 */}
      {activeFilterCount > 0 && !isFilterOpen && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {filters.status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              상태: {STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}
              <button
                onClick={() => handleQuickFilter('status', 'ALL')}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.role && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              유형: {ROLE_OPTIONS.find((o) => o.value === filters.role)?.label}
              <button onClick={() => handleQuickFilter('role', '')} className="hover:text-red-500">
                ×
              </button>
            </span>
          )}
          {filters.category && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              분류: {CATEGORY_OPTIONS.find((o) => o.value === filters.category)?.label}
              <button
                onClick={() => handleQuickFilter('category', '')}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.teamId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              팀:{' '}
              {teams.find((t) => t.id.toString() === filters.teamId)?.name ||
                `팀 ${filters.teamId}`}
              <button
                onClick={() => handleQuickFilter('teamId', '')}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {(filters.availableFrom || filters.availableTo) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs text-blue-700">
              📅{' '}
              {filters.availableFrom && new Date(filters.availableFrom).toLocaleDateString('ko-KR')}
              {filters.availableFrom && filters.availableTo && ' ~ '}
              {filters.availableTo &&
                new Date(filters.availableTo).toLocaleDateString('ko-KR')}{' '}
              근무가능
              <button
                onClick={() => {
                  const newFilters = { ...filters, availableFrom: '', availableTo: '' };
                  setFilters(newFilters);
                  onSearch(newFilters);
                }}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.profileIncomplete && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded text-xs text-amber-700">
              📝 정보 입력 미완료
              <button
                onClick={() => {
                  const newFilters = { ...filters, profileIncomplete: false };
                  setFilters(newFilters);
                  onSearch(newFilters);
                }}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
