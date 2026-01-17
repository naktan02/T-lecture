// client/src/features/unit/ui/UnitToolbar.tsx
import { useRef, useState, ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { ConfirmModal } from '../../../shared/ui';

interface SearchFilters {
  keyword: string;
  startDate: string;
  endDate: string;
  hasAddressError?: boolean;
  validationStatus?: string;
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
    hasAddressError: false,
    validationStatus: '',
  });

  // ✅ 업로드 확인 모달 상태
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
    }
  };

  const confirmUpload = async (): Promise<void> => {
    if (pendingFile) {
      try {
        await onUploadExcel(pendingFile);
      } catch {
        // useUnit에서 처리됨
      }
      setPendingFile(null);
      // input 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelUpload = (): void => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFilters((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSearch = (): void => {
    onSearch(filters);
    setIsFilterOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleReset = (): void => {
    const initial = {
      keyword: '',
      startDate: '',
      endDate: '',
      hasAddressError: false,
      validationStatus: '',
    };
    setFilters(initial);
    onSearch(initial);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* 상단: 제목 + 액션 버튼 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">부대 관리</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            총 <span className="font-bold text-green-600">{totalCount.toLocaleString()}</span>개
          </p>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-2 flex-wrap">
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
                       bg-white text-gray-600 text-sm hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
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
                       hover:bg-green-600 active:scale-95 transition-all shadow-sm shadow-green-200"
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
      <div className="hidden md:flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* 기간 선택 */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
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
            max="2099-12-31"
            className="text-sm bg-transparent outline-none w-28 lg:w-32 cursor-pointer"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
            max="2099-12-31"
            className="text-sm bg-transparent outline-none w-28 lg:w-32 cursor-pointer"
          />
        </div>

        {/* 주소 오류 체크 */}
        <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            name="hasAddressError"
            checked={!!filters.hasAddressError}
            onChange={handleChange}
            className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-gray-300"
          />
          <span className="text-sm text-gray-700 flex items-center gap-1">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            주소 오류
          </span>
        </label>

        {/* 검증 상태 필터 */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 shadow-sm">
          <select
            name="validationStatus"
            value={filters.validationStatus}
            onChange={handleChange}
            className="text-sm bg-transparent outline-none py-2 cursor-pointer text-gray-700"
          >
            <option value="">전체 상태</option>
            <option value="Valid">정상 데이터</option>
            <option value="Invalid">오류 데이터</option>
          </select>
        </div>

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
            name="keyword"
            placeholder="부대명, 지역, 주소 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm 
                       focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all shadow-sm"
            value={filters.keyword}
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
        {(filters.keyword ||
          filters.startDate ||
          filters.endDate ||
          filters.hasAddressError ||
          filters.validationStatus) && (
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
              max="2099-12-31"
              className="flex-1 px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
            />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleChange}
              max="2099-12-31"
              className="flex-1 px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none"
            />
          </div>

          {/* 주소 오류 체크 (모바일) */}
          <label className="flex items-center gap-2 px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              name="hasAddressError"
              checked={!!filters.hasAddressError}
              onChange={handleChange}
              className="w-5 h-5 rounded text-red-500 focus:ring-red-500 border-gray-300"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              주소 오류 데이터만 보기
            </span>
          </label>

          {/* 검증 상태 필터 (모바일) */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 shadow-sm">
            <select
              name="validationStatus"
              value={filters.validationStatus}
              onChange={handleChange}
              className="w-full text-sm bg-transparent outline-none py-3 cursor-pointer text-gray-700"
            >
              <option value="">전체 검증 상태</option>
              <option value="Valid">정상 데이터</option>
              <option value="Invalid">오류 데이터</option>
            </select>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 확인 모달 */}
      <ConfirmModal
        isOpen={!!pendingFile}
        title="엑셀 업로드"
        message={`${pendingFile?.name} 파일을 업로드하시겠습니까?`}
        confirmText="업로드"
        cancelText="취소"
        onConfirm={confirmUpload}
        onCancel={cancelUpload}
      />
    </div>
  );
};
