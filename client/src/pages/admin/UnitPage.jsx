// client/src/pages/admin/UnitPage.jsx
import React, { useState, useMemo } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { useUnit } from '../../features/unit/model/useUnit';
import { UnitToolbar } from '../../features/unit/ui/UnitToolbar';
import { UnitList } from '../../features/unit/ui/UnitList';
import { UnitDetailDrawer } from '../../features/unit/ui/UnitDetailDrawer';

const UnitPage = () => {
  const { units, meta, page, setPage, isLoading, registerUnit, updateUnit, deleteUnit } = useUnit();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 클라이언트 사이드 검색 (API 검색 시 useUnit에 params 전달 필요)
  const filteredUnits = useMemo(() => {
    if (!searchTerm) return units;
    return units.filter(u => u.name?.includes(searchTerm) || u.region?.includes(searchTerm));
  }, [units, searchTerm]);

  return (
    // h-screen과 overflow-hidden으로 브라우저 스크롤 방지
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <AdminHeader />
      
      {/* 메인 컨텐츠 영역: flex-1로 남은 높이 차지 */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col min-h-0">
        
        {/* 툴바: 고정 높이 */}
        <div className="shrink-0">
          <UnitToolbar 
            onSearch={setSearchTerm} 
            onCreate={() => { setSelectedUnit(null); setIsDrawerOpen(true); }} 
            totalCount={meta?.total || 0}
          />
        </div>

        {/* 리스트 영역: 남은 높이 모두 차지 (flex-1), 내부 스크롤 (overflow-hidden -> 자식에게 위임) */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 relative">
          {/* UnitList 컴포넌트 내부에서 스크롤 처리 */}
          <UnitList 
            units={filteredUnits} 
            onUnitClick={(u) => { setSelectedUnit(u); setIsDrawerOpen(true); }} 
          />
        </div>

        {/* 페이지네이션: 고정 높이 */}
        <div className="shrink-0 py-4 flex justify-center items-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1 border rounded bg-white disabled:opacity-50">이전</button>
          <span>{page} / {meta.lastPage || 1}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page >= (meta.lastPage||1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50">다음</button>
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