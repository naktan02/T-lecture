// client/src/features/unit/ui/UnitToolbar.tsx
import { useRef, useState, ChangeEvent, KeyboardEvent, ReactElement } from 'react';

interface SearchFilters {
  keyword: string;
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

interface UnitToolbarProps {
  onSearch: (filters: SearchFilters) => void;
  onUploadExcel: (file: File) => Promise<unknown>;
  onCreate: () => void;
  totalCount: number;
}

export const UnitToolbar = ({
  onSearch,
  onUploadExcel,
  onCreate,
  totalCount,
}: UnitToolbarProps): ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 로컬 상태로 검색 조건 관리
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    startDate: '',
    endDate: '',
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file && window.confirm(`${file.name}을 업로드하시겠습니까?`)) {
      try {
        await onUploadExcel(file);
      } catch {
        /* useUnit에서 처리됨 */
      }
    }
    e.target.value = '';
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
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
    setFilters({ keyword: '', startDate: '', endDate: '' });
    onSearch({ keyword: '', startDate: '', endDate: '' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* 상단: 제목 + 액션 버튼 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">부대 관리</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            총 <span className="font-bold text-green-600">{totalCount.toLocaleString()}</span>개
          </p>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {/* 필터 토글 (모바일) */}
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

          {/* 엑셀 업로드 */}
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 
                       bg-white text-gray-600 text-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span className="hidden sm:inline">엑셀</span>
          </button>

          {/* 신규 등록 */}
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg 
                       bg-green-500 text-white text-sm font-medium
                       hover:bg-green-600 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">신규 등록</span>
          </button>
        </div>
      </div>

      {/* 데스크톱 검색 바 */}
      <div className="hidden md:flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* 기간 선택 */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleChange}
            className="text-sm bg-transparent outline-none w-32"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
            className="text-sm bg-transparent outline-none w-32"
          />
        </div>

        {/* 검색어 */}
        <div className="flex-1 relative">
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
            name="keyword"
            placeholder="부대명, 지역, 담당자 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm 
                       focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            value={filters.keyword}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium
                     hover:bg-green-600 active:scale-95 transition-all"
        >
          검색
        </button>

        {/* 초기화 */}
        {(filters.keyword || filters.startDate || filters.endDate) && (
          <button
            onClick={handleReset}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 모바일 검색 패널 */}
      {isFilterOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-gray-100 space-y-3">
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
              name="keyword"
              placeholder="검색어 입력..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm outline-none"
              value={filters.keyword}
              onChange={handleChange}
            />
          </div>

          {/* 기간 */}
          <div className="flex gap-2">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleChange}
              className="flex-1 px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
            />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleChange}
              className="flex-1 px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
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
