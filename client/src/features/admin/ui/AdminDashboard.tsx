// src/features/admin/ui/AdminDashboard.tsx
import React from 'react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">관리자 대시보드</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">관리자님, 환영합니다!</p>
        <p className="text-sm text-gray-500 mt-2">
          여기서 회원 관리 및 배정 관리를 할 수 있습니다.
        </p>

        {/* 나중에 여기에 '회원 목록'이나 '배정 현황' 컴포넌트를 추가하면 됩니다. */}
      </div>
    </div>
  );
};
