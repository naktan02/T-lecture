// src/shared/ui/MainLayout.jsx
import React from 'react';

/**
 * MainLayout
 * - 배경색, 중앙 정렬 등 기본적인 레이아웃 컨테이너 역할만 수행합니다.
 * - 헤더(네비게이션)는 각 페이지에서 CommonHeader를 직접 사용하여 제어합니다.
 */
export const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
};