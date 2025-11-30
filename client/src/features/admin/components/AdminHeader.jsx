// src/features/admin/components/AdminHeader.jsx
import React from 'react';
// 아이콘이나 로고 이미지가 있다면 import

export const AdminHeader = ({ title, userLabel = "관리자 님" }) => {
    return (
        <header className="bg-slate-800 text-white h-14 flex items-center justify-between px-6 shadow mb-6">
        {/* 왼쪽: 타이틀 */}
        <div className="flex items-center gap-2 font-semibold">
            <span className="text-green-400 text-lg">●</span>
            <span>{title}</span>
        </div>

        {/* 중앙: 네비게이션 (추후 링크 연결 가능) */}
        <nav className="flex gap-5 text-sm text-slate-300">
            <span className="text-white font-bold cursor-pointer">권한 관리</span>
            <span className="hover:text-white cursor-not-allowed opacity-60" title="준비중">배정 관리</span>
            <span className="hover:text-white cursor-not-allowed opacity-60" title="준비중">시스템 설정</span>
        </nav>

        {/* 오른쪽: 유저 정보 */}
        <div className="text-xs text-gray-300 border py-1 px-2 rounded border-slate-600">
            {userLabel}
        </div>
        </header>
    );
};