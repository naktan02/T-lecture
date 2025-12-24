// client/src/pages/admin/UnitPage.tsx
import { useState, ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { useUnit } from '../../features/unit/model/useUnit';
import { UnitToolbar } from '../../features/unit/ui/UnitToolbar';
import { UnitList } from '../../features/unit/ui/UnitList';
import { UnitDetailDrawer } from '../../features/unit/ui/UnitDetailDrawer';
import { ConfirmModal } from '../../shared/ui';

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
  // 전체 페이지 데이터 선택 여부
  const [selectAll, setSelectAll] = useState(false);

  // ✅ 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setSelectAll(false);
  };

  // ✅ 개별 선택 토글
  const handleToggleSelect = (id: number): void => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // ✅ 전체 선택 토글 (현재 페이지)
  const handleToggleAll = (isChecked: boolean): void => {
    if (isChecked) {
      // 현재 페이지의 모든 ID 선택
      const allIds = units.map((u: Unit) => u.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
      setSelectAll(false);
    }
  };

  // ✅ 검색된 모든 데이터 선택
  const handleSelectAllData = () => {
    setSelectAll(true);
  };

  // ✅ 선택 삭제 핸들러
  const handleDeleteSelected = async (): Promise<void> => {
    if (selectedIds.length === 0) return;
    try {
      // selectAll이 true이면 전체 삭제 요청, 아니면 ID 목록 삭제
      await deleteUnits(selectedIds, selectAll, searchParams);
      setSelectedIds([]);
      setSelectAll(false);
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 flex flex-col min-h-0">
        {/* 툴바 영역 */}
        <div className="shrink-0 mb-3 md:mb-4">
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

        {/* 선택 삭제 바 */}
        {selectedIds.length > 0 && (
          <div className="shrink-0 mb-3 flex flex-col gap-2">
            <div className="flex justify-between items-center bg-green-50 p-3 px-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {selectAll ? meta?.total : selectedIds.length}
                </span>
                <span className="text-sm text-green-800 font-medium">
                  {selectAll ? `전체 ${meta?.total}개 데이터가 선택되었습니다.` : '개 선택됨'}
                </span>
                {!selectAll && meta?.total > selectedIds.length && (
                  <button
                    onClick={handleSelectAllData}
                    className="ml-4 text-sm text-blue-600 underline hover:text-blue-800 font-bold"
                  >
                    검색된 모든 데이터 {meta?.total}개 선택하기
                  </button>
                )}
                {selectAll && (
                  <button
                    onClick={() => {
                      setSelectAll(false);
                      setSelectedIds([]);
                    }}
                    className="ml-4 text-sm text-gray-500 underline hover:text-gray-700"
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg 
                            hover:bg-red-600 active:scale-95 transition-all text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 리스트 영역 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">데이터를 불러오는 중...</p>
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
        <div className="shrink-0 py-3 md:py-4 flex justify-center items-center gap-2 md:gap-4">
          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 md:px-4 border rounded-lg bg-white 
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 
                       active:scale-95 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="hidden sm:inline">이전</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <span className="text-sm font-medium text-gray-700">{page}</span>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm text-gray-500">{meta?.lastPage || 1}</span>
          </div>

          <button
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page >= (meta?.lastPage || 1)}
            className="flex items-center gap-1 px-3 py-2 md:px-4 border rounded-lg bg-white 
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 
                       active:scale-95 transition-all text-sm"
          >
            <span className="hidden sm:inline">다음</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="부대 삭제"
        message={
          selectAll
            ? `전체 ${meta?.total}개 데이터를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
            : `선택한 ${selectedIds.length}개 부대를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`
        }
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default UnitPage;
