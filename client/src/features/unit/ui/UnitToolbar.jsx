import React, { useRef } from 'react';
import { Button } from '../../../shared/ui/Button'; // 경로 확인: features/unit/ui -> shared/ui

export const UnitToolbar = ({ onSearch, onUploadExcel, onCreate, totalCount }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && window.confirm(`${file.name}을 업로드하시겠습니까?`)) {
      try {
        await onUploadExcel(file);
      } catch(e) { /* useUnit에서 처리됨 */ }
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">부대 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          총 <span className="font-bold text-green-600">{totalCount}</span>개의 부대
        </p>
      </div>

      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <input 
          type="text" 
          placeholder="부대명, 지역 검색..." 
          className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none flex-grow md:w-64"
          onChange={(e) => onSearch(e.target.value)}
        />
        
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          accept=".xlsx,.xls" 
          onChange={handleFileChange} 
        />
        <Button variant="outline" size="small" onClick={() => fileInputRef.current.click()}>
          📂 엑셀 등록
        </Button>

        <Button variant="primary" size="small" onClick={onCreate}>
          + 신규 등록
        </Button>
      </div>
    </div>
  );
};