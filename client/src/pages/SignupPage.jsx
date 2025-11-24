// client/src/pages/SignupPage.jsx

import React from 'react';
// 기능(Feature) 폴더에서 실제 회원가입 폼을 가져옴
import { RegisterForm } from '../features/auth/ui/RegisterForm'; 
// 공용 레이아웃이 있다면 가져옴
import { MainLayout } from '../shared/ui/MainLayout';

const SignupPage = () => {
    return (
        <MainLayout>
        <div className="signup-page-container" style={{ padding: '50px 0' }}>
            {/* 실제 로직이 담긴 컴포넌트 렌더링 */}
            <RegisterForm />
        </div>
        </MainLayout>
    );
};

export default SignupPage;