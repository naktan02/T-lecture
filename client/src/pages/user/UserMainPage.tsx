// src/pages/user/UserMainPage.tsx
import { Suspense, lazy } from 'react';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { LoadingSpinner } from '../../shared/ui';

const UserProfilePage = lazy(() => import('./UserProfilePage'));

const UserMainPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <UserHeader />
      <Suspense fallback={<LoadingSpinner fullScreen message="페이지를 불러오는 중입니다." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/user-main/dispatches" replace />} />
          <Route path="profile" element={<UserProfilePage />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default UserMainPage;
