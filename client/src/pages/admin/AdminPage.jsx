// client/src/pages/admin/AdminPage.jsx (Refactored)
import React from 'react';
import { MainLayout } from '../../shared/ui/MainLayout';
import { AdminDashboard } from '../../features/admin/ui/AdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { CommonHeader } from '../../shared/ui/CommonHeader';

const AdminPage = () => {
    // ADMIN 권한 필수
    const { shouldRender } = useAuthGuard('ADMIN');

    // 유저 이름 파싱
    let userLabel = '관리자';
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            userLabel = user.name || user.email || '관리자';
        }
    } catch (e) {
        console.error('User parsing error', e);
    }

    if (!shouldRender) return null;

    return (
        <>
            <CommonHeader
                title="관리자 페이지"
                userLabel={userLabel}
            />
            <MainLayout>
                <AdminDashboard />
            </MainLayout>
        </>
    );
};

export default AdminPage;
