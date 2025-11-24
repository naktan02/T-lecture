//client/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages (껍데기) 불러오기
import HomePage from './pages/HomePage'; 
import LoginPage from './pages/login';   
import SignupPage from './pages/SignupPage';

function App() {
    return (
        <BrowserRouter>
        {/* Next.js의 _app.jsx에 있던 전역 레이아웃/Provider는 여기에 배치 */}
        <Routes>
            {/* 주소와 페이지 연결 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<SignupPage />} />
            
            {/* 없는 주소 처리 (Redirect) */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
    );
}

export default App;