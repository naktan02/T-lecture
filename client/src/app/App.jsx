//client/src/App.jsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const queryClient = new QueryClient();

// Pages (껍데기) 불러오기
import LoginPage from '../pages/login';   
import SignupPage from '../pages/SignupPage';
import InstructorSchedulePage from '../pages/schedule';
import AdminPage from '../pages/AdminPage';
import UserMainHome from '../pages/userMainHome';
import SuperAdminPage from '../pages/SuperAdminPage';


function App() {
    return (
        <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        {/* Next.js의 _app.jsx에 있던 전역 레이아웃/Provider는 여기에 배치 */}
        <Routes>
            {/* 주소와 페이지 연결 */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<SignupPage />} />
            <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
            <Route path="/admin/super" element={<SuperAdminPage />} />
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="/user-main/*" element={<UserMainHome />} />
            {/* 없는 주소 처리 (Redirect) */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;