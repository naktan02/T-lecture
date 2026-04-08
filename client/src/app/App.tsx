// src/app/App.tsx
import { Suspense, lazy, useEffect, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useVisibilityChange } from '../shared/hooks/useVisibilityChange';

const queryClient = new QueryClient();

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const InstructorSchedulePage = lazy(() => import('../pages/instructor/SchedulePage'));
const InstructorDashboardPage = lazy(() => import('../pages/instructor/DashboardPage'));
const DispatchInboxPage = lazy(() => import('../pages/instructor/DispatchInboxPage'));
const AdminPage = lazy(() => import('../pages/admin/AdminPage'));
const UserMainHome = lazy(() => import('../pages/user/UserMainPage'));
const SuperAdminPage = lazy(() => import('../pages/admin/SuperAdminPage'));
const AssignmentPage = lazy(() => import('../pages/admin/AssignmentPage'));
const UnitPage = lazy(() => import('../pages/admin/UnitPage'));
const UserPage = lazy(() => import('../pages/admin/UserPage'));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'));
const AssignmentSettingsPage = lazy(() => import('../pages/admin/AssignmentSettingsPage'));
const AdminNoticePage = lazy(() => import('../pages/admin/NoticePage'));
const InstructorNoticePage = lazy(() => import('../pages/instructor/NoticePage'));
const AdminInquiryPage = lazy(() => import('../pages/admin/InquiryPage'));
const InstructorInquiryPage = lazy(() => import('../pages/instructor/InquiryPage'));
const TermsPage = lazy(() => import('../pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/legal/PrivacyPage'));

// 모바일 백그라운드 복귀 시 토큰 체크 컴포넌트
function AuthVisibilityGuard() {
  useVisibilityChange();
  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
      페이지를 불러오는 중입니다.
    </div>
  );
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
