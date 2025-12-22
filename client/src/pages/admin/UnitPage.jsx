import React, { useState, useMemo } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
// 1. 모델(로직) import
import { useUnit } from '../../features/unit/model/useUnit';
// 2. UI 컴포넌트 import (경로가 ui 폴더로 통일됨)
import { UnitToolbar } from '../../features/unit/ui/UnitToolbar';
import { UnitList } from '../../features/unit/ui/UnitList';
import { UnitDetailDrawer } from '../../features/unit/ui/UnitDetailDrawer';

const UnitPage = () => {
  const { units, meta, page, setPage, isLoading, registerUnit, uploadExcel, updateUnit, deleteUnit } = useUnit();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 검색 필터링 로직
  const filteredUnits = useMemo(() => {
    if (!searchTerm) return units;
    return units.filter(unit => 
      unit.name?.includes(searchTerm) || 
      unit.region?.includes(searchTerm)
    );
  }, [units, searchTerm]);

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    setIsDrawerOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedUnit(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedUnit(null), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader />
      
      {/* 화면 전체 높이에서 헤더 제외한 영역 사용 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-80px)]">
        
        <UnitToolbar 
           onSearch={setSearchTerm} 
           onCreate={() => { setSelectedUnit(null); setIsDrawerOpen(true); }} 
           totalCount={meta?.total || 0}
        />

        {/* 리스트 영역 (스크롤 가능) */}
        <div className="flex-1 min-h-0 mb-4">
           {isLoading ? <div>Loading...</div> : (
             <UnitList units={units} onUnitClick={(u) => { setSelectedUnit(u); setIsDrawerOpen(true); }} />
           )}
        </div>

        {/* 페이지네이션 컨트롤 */}
        <div className="flex justify-center items-center gap-4 py-2 bg-white rounded-lg border shadow-sm shrink-0">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm font-medium">
            Page {page} of {meta?.lastPage || 1}
          </span>
          <button 
            onClick={() => setPage(p => (meta?.lastPage && p < meta.lastPage ? p + 1 : p))}
            disabled={page >= (meta?.lastPage || 1)}
            className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
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