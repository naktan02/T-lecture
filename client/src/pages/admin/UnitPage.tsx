// client/src/pages/admin/UnitPage.tsx
import { useState, ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { useUnit } from '../../features/unit/model/useUnit';
import { UnitToolbar } from '../../features/unit/ui/UnitToolbar';
import { UnitList } from '../../features/unit/ui/UnitList';
import { UnitDetailDrawer } from '../../features/unit/ui/UnitDetailDrawer';
import { showSuccess, showConfirm } from '../../shared/utils';

interface SearchParams {
  keyword: string;
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

interface Unit {
  id: number;
  name: string;
  [key: string]: unknown;
}

const UnitPage = (): ReactElement => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    keyword: '',
    startDate: '',
    endDate: '',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // ✅ 다중 선택 상태 관리
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const {
    units,
    meta,
    page,
    setPage,
    isLoading,
    registerUnit,
    updateUnit,
    deleteUnit,
    deleteUnits,
    uploadExcel,
  } = useUnit(searchParams);

  // 검색 핸들러
  const handleSearch = (newParams: SearchParams): void => {
    setSearchParams(newParams);
    setPage(1);
    setSelectedIds([]); // 검색 시 선택 초기화
  };

  // ✅ 개별 선택 토글
  const handleToggleSelect = (id: number): void => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // ✅ 전체 선택 토글
  const handleToggleAll = (isChecked: boolean): void => {
    if (isChecked) {
      // 현재 페이지의 모든 ID 선택
      const allIds = units.map((u: Unit) => u.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  // ✅ 선택 삭제 핸들러
  const handleDeleteSelected = (): void => {
    if (selectedIds.length === 0) return;
    showConfirm(`선택한 ${selectedIds.length}개 부대를 삭제하시겠습니까?`, async () => {
      try {
        await deleteUnits(selectedIds);
        setSelectedIds([]);
        showSuccess('삭제되었습니다.');
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <AdminHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col min-h-0">
        {/* 툴바 영역 */}
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
          <div className="w-full">
            <UnitToolbar
              onSearch={handleSearch}
              onUploadExcel={uploadExcel}
              onCreate={() => {
                setSelectedUnit(null);
                setIsDrawerOpen(true);
              }}
              totalCount={meta?.total || 0}
            />
          </div>
        </div>

        {/* ✅ 선택 삭제 버튼 (선택된 항목이 있을 때만 표시) */}
        {selectedIds.length > 0 && (
          <div className="shrink-0 mb-2 flex justify-between items-center bg-blue-50 p-2 px-4 rounded border border-blue-100 text-blue-800 text-sm">
            <span>{selectedIds.length}개 항목이 선택됨</span>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 font-medium text-xs"
            >
              선택 삭제 🗑️
            </button>
          </div>
        )}

        {/* 리스트 영역 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 relative">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              데이터를 불러오는 중입니다...
            </div>
          ) : (
            <UnitList
              units={units}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
              onUnitClick={(u: Unit) => {
                setSelectedUnit(u);
                setIsDrawerOpen(true);
              }}
            />
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="shrink-0 py-4 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded bg-white disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {meta?.lastPage || 1}
          </span>
          <button
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page >= (meta?.lastPage || 1)}
            className="px-3 py-1 border rounded bg-white disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </main>

      <UnitDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        unit={selectedUnit}
        onRegister={registerUnit}
        onUpdate={updateUnit}
        onDelete={deleteUnit}
      />
    </div>
  );
};

export default UnitPage;
