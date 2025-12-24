// client/src/features/unit/ui/UnitToolbar.tsx
import { useRef, useState, ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import { showConfirm } from '../../../shared/utils';
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

  // ✅ 로컬 상태로 검색 조건 관리
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    startDate: '',
    endDate: '',
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      showConfirm(`${file.name}을 업로드하시겠습니까?`, async () => {
        try {
          await onUploadExcel(file);
        } catch {
          /* useUnit에서 처리됨 */
        }
      });
    }
    e.target.value = '';
  };

  // 입력값 변경 핸들러
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // 검색 실행 (엔터키 또는 버튼 클릭)
  const handleSearch = (): void => {
    onSearch(filters); // 부모에게 필터 객체 전달
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">부대 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          총 <span className="font-bold text-green-600">{totalCount}</span>개의 부대
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
        {/* ✅ 기간 검색 필드 추가 */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1">
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleChange}
            className="text-sm outline-none bg-transparent"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
            className="text-sm outline-none bg-transparent"
          />
        </div>

        {/* 검색어 입력 */}
        <input
          type="text"
          name="keyword"
          placeholder="부대명, 지역 검색..."
          className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none w-48"
          value={filters.keyword}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        {/* 검색 버튼 */}
        <Button variant="primary" size="small" onClick={handleSearch}>
          🔍 검색
        </Button>

        {/* 구분선 */}
        <div className="h-6 w-px bg-gray-300 mx-1"></div>

        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="small" onClick={() => fileInputRef.current?.click()}>
          📂 엑셀
        </Button>

        <Button variant="primary" size="small" onClick={onCreate}>
          + 신규
        </Button>
      </div>
    </div>
  );
};
