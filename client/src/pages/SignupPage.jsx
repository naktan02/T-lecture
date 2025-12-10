// client/src/pages/SignupPage.jsx (Refactored)
import React from 'react';
import { RegisterForm } from '../features/auth/ui/RegisterForm'; 
import { MainLayout } from '../shared/ui/MainLayout';
import { useAuthGuard } from '../features/auth/model/useAuthGuard'; // 💡 Guard Hook 추가

const SignupPage = () => {
    // GUEST 설정: 로그인 상태면 메인으로 튕겨냄
    const { shouldRender } = useAuthGuard('GUEST'); 

    if (!shouldRender) return null; // 로그인 상태면 숨김

    return (
        <MainLayout>
        <div className="signup-page-container" style={{ padding: '50px 0' }}>
            <RegisterForm />
        </div>
        </MainLayout>
    );
};

export default SignupPage;