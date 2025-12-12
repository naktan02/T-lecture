// client/src/pages/admin/SuperAdminPage.jsx (Guard 적용)
import React from 'react';
// import { MainLayout } from '../../shared/ui/MainLayout'; // 💡 MainLayout 제거 (Dashboard 내부에서 레이아웃 처리)
import { SuperAdminDashboard } from '../../features/admin/ui/SuperAdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const SuperAdminPage = () => {
    // SUPER_ADMIN 권한이 필요하다고 선언
    const { shouldRender } = useAuthGuard('SUPER_ADMIN');

    // 권한이 없거나 토큰이 없어서 쫓겨나는 중이면 아무것도 렌더링하지 않습니다.
    if (!shouldRender) return null;

    return (
        <SuperAdminDashboard />
    );
};

export default SuperAdminPage;
