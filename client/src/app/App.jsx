import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
const queryClient = new QueryClient();

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import InstructorSchedulePage from '../pages/instructor/SchedulePage';
import AdminPage from '../pages/admin/AdminPage';
import UserMainHome from '../pages/user/UserMainPage';
import SuperAdminPage from '../pages/admin/SuperAdminPage';
import AssignmentPage from '../pages/admin/AssignmentPage';


function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    
                    {/* 일반 유저 및 강사 */}
                    <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
                    <Route path="/user-main/*" element={<UserMainHome />} />

                    {/* 일반 관리자 */}
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/assignments" element={<AssignmentPage />} />

                    {/* 슈퍼 관리자 (Nested Layout 제거 -> Flat Route) */}
                    <Route path="/admin/super" element={<SuperAdminPage />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;