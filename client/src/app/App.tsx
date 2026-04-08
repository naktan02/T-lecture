// src/app/App.tsx
import { useEffect, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useVisibilityChange } from '../shared/hooks/useVisibilityChange';

const queryClient = new QueryClient();

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import InstructorSchedulePage from '../pages/instructor/SchedulePage';
import InstructorDashboardPage from '../pages/instructor/DashboardPage';
import DispatchInboxPage from '../pages/instructor/DispatchInboxPage';
import AdminPage from '../pages/admin/AdminPage';
import UserMainHome from '../pages/user/UserMainPage';
import SuperAdminPage from '../pages/admin/SuperAdminPage';
import AssignmentPage from '../pages/admin/AssignmentPage';
import UnitPage from '../pages/admin/UnitPage';
import UserPage from '../pages/admin/UserPage';
import SettingsPage from '../pages/admin/SettingsPage';
import AssignmentSettingsPage from '../pages/admin/AssignmentSettingsPage';
import AdminNoticePage from '../pages/admin/NoticePage';
import InstructorNoticePage from '../pages/instructor/NoticePage';
import AdminInquiryPage from '../pages/admin/InquiryPage';
import InstructorInquiryPage from '../pages/instructor/InquiryPage';
import TermsPage from '../pages/legal/TermsPage';
import PrivacyPage from '../pages/legal/PrivacyPage';

// 모바일 백그라운드 복귀 시 토큰 체크 컴포넌트
function AuthVisibilityGuard() {
  useVisibilityChange();
  return null;
}

function App(): ReactElement {
  // 전역 백스페이스 이전 페이지 이동 방지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Backspace' && !isEditable) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* 토스트 컨테이너 */}
      <Toaster />

      <BrowserRouter>
        {/* 모바일 백그라운드 복귀 시 토큰 유효성 체크 */}
        <AuthVisibilityGuard />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* 일반 유저 및 강사 */}
          <Route path="/instructor/schedule" element={<InstructorSchedulePage />} />
          <Route path="/instructor/dashboard" element={<InstructorDashboardPage />} />
          <Route path="/user-main/dispatches" element={<DispatchInboxPage />} />
          <Route path="/user-main/*" element={<UserMainHome />} />

          {/* 일반 관리자 - 기본 페이지는 강사배정 */}
          <Route path="/admin" element={<Navigate to="/admin/assignments" replace />} />
          <Route path="/admin/dashboard" element={<AdminPage />} />
          <Route path="/admin/assignments" element={<AssignmentPage />} />
          <Route path="/admin/assignment-settings" element={<AssignmentSettingsPage />} />
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

          {/* 약관 페이지 */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
