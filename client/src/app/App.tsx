// src/app/App.tsx
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient();

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import InstructorSchedulePage from '../pages/instructor/SchedulePage';
import MessageInboxPage from '../pages/instructor/MessageInboxPage';
import AdminPage from '../pages/admin/AdminPage';
import UserMainHome from '../pages/user/UserMainPage';
import SuperAdminPage from '../pages/admin/SuperAdminPage';
import AssignmentPage from '../pages/admin/AssignmentPage';
import UnitPage from '../pages/admin/UnitPage';
import UserPage from '../pages/admin/UserPage';
import SettingsPage from '../pages/admin/SettingsPage';
import AdminNoticePage from '../pages/admin/NoticePage';
import InstructorNoticePage from '../pages/instructor/NoticePage';
import AdminInquiryPage from '../pages/admin/InquiryPage';
import InstructorInquiryPage from '../pages/instructor/InquiryPage';

function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 토스트 컨테이너 */}
      <Toaster />

      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 일반 유저 및 강사 */}
          <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
          <Route path="/user-main/messages" element={<MessageInboxPage />} />
          <Route path="/user-main/*" element={<UserMainHome />} />

          {/* 일반 관리자 */}
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/assignments" element={<AssignmentPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />

          {/* 슈퍼 관리자 */}
          <Route path="/admin/super" element={<SuperAdminPage />} />

          {/* 부대 관리 */}
          <Route path="/admin/units" element={<UnitPage />} />

          {/* 유저 관리 */}
          <Route path="/admin/users" element={<UserPage />} />

          {/* 공지사항 관리 */}
          <Route path="/admin/notices" element={<AdminNoticePage />} />
          <Route path="/instructor/notices" element={<InstructorNoticePage />} />

          {/* 문의사항 관리 */}
          <Route path="/admin/inquiries" element={<AdminInquiryPage />} />
          <Route path="/instructor/inquiries" element={<InstructorInquiryPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
