// client/src/pages/userMainHome.jsx (Refactored)
import React from 'react';
import { MainLayout } from '../shared/ui/MainLayout';
import { UserDashboard } from '../features/user/ui/userMainhome';
import { useAuthGuard } from '../features/auth/model/useAuthGuard'; 
import { CommonHeader } from '../shared/ui/CommonHeader';

const UserMainHome = () => {
    // USER 권한 필수
    const { shouldRender } = useAuthGuard('USER');

    // 유저 이름 파싱
    let userLabel = 'User';
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            userLabel = user.name || user.email || 'User';
        }
    } catch (e) {
        console.error('User parsing error', e);
    }

    if (!shouldRender) return null; 

    return (
        <>
            <CommonHeader 
                title="T-Lecture" 
                userLabel={userLabel}
            />
            <MainLayout>
                <UserDashboard />
            </MainLayout>
        </>
    );
};

export default UserMainHome;