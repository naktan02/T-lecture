import React, { useState } from 'react'; // useMemo 제거
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { useUnit } from '../../features/unit/model/useUnit';
import { UnitToolbar } from '../../features/unit/ui/UnitToolbar';
import { UnitList } from '../../features/unit/ui/UnitList';
import { UnitDetailDrawer } from '../../features/unit/ui/UnitDetailDrawer';

const UnitPage = () => {
  // ✅ 검색 조건 State 추가
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    startDate: '',
    endDate: ''
  });

  // ✅ useUnit에 검색 조건 전달 (필터링은 서버에서 처리)
  const { 
    units, 
    meta, 
    page, 
    setPage, 
    isLoading, 
    registerUnit, 
    updateUnit, 
    deleteUnit, 
    uploadExcel 
  } = useUnit(searchParams);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // ✅ 툴바에서 검색 버튼 클릭 시 호출
  const handleSearch = (newParams) => {
    setSearchParams(newParams);
    setPage(1); // 검색 조건 변경 시 1페이지로 초기화
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <AdminHeader />
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col min-h-0">
        
        <div className="shrink-0">
          <UnitToolbar 
            onSearch={handleSearch} // ✅ 핸들러 연결
            onUploadExcel={uploadExcel}
            onCreate={() => { setSelectedUnit(null); setIsDrawerOpen(true); }} 
            totalCount={meta?.total || 0}
          />
        </div>

        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 relative">
          {/* 로딩 표시 추가 */}
          {isLoading ? (
            <div className="flex justify-center items-center h-full">로딩 중...</div>
          ) : (
            <UnitList 
              units={units} // ✅ 필터링된 서버 데이터 바로 사용
              onUnitClick={(u) => { setSelectedUnit(u); setIsDrawerOpen(true); }} 
            />
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="shrink-0 py-4 flex justify-center items-center gap-4">
          <button 
            onClick={() => setPage(p => Math.max(1, p-1))} 
            disabled={page === 1} 
            className="px-3 py-1 border rounded bg-white disabled:opacity-50"
          >
            이전
          </button>
          <span>{page} / {meta.lastPage || 1}</span>
          <button 
            onClick={() => setPage(p => p+1)} 
            disabled={page >= (meta.lastPage || 1)} 
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
        onSave={selectedUnit ? updateUnit : registerUnit}
        onDelete={deleteUnit}
      />
    </div>
  );
};

export default UnitPage;