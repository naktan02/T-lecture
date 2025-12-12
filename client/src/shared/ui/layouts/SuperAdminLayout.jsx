import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommonHeader } from '../CommonHeader';

export const SuperAdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // 관리자 메뉴 정의
    const adminLinks = [
        { label: '권한 관리', path: '/admin/super' }, // 대시보드 (기존 /admin/users 대신 /admin/super 사용 중인 것으로 보임)
        { label: '강사 배정', path: '/admin/assignments' },
        { label: '시스템 설정', path: '/admin/settings' },
    ];

    // TODO: 실제 유저 정보는 Context나 전역 상태에서 가져와야 함
    const userLabel = "최고관리자 님";

    return (
        <div className="min-h-screen bg-gray-100">
            <CommonHeader
                title="슈퍼 관리자 페이지"
                userLabel={userLabel}
                links={adminLinks}
            />
            <main className="p-6 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};
