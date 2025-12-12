//client/src/App.jsx
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
import { SuperAdminLayout } from '../shared/ui/layouts/SuperAdminLayout';

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/user-main/*" element={<UserMainHome />} />

                    {/* Super Admin Routes wrapped in Layout */}
                    <Route path="/admin/super" element={<SuperAdminLayout />}>
                        <Route index element={<SuperAdminPage />} />
                    </Route>
                    <Route path="/admin/assignments" element={<SuperAdminLayout />}>
                        <Route index element={<AssignmentPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;