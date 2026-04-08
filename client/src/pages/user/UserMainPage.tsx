// src/pages/user/UserMainPage.tsx
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserProfilePage from './UserProfilePage';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { LoadingSpinner } from '../../shared/ui';

const UserMainPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <UserHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/user-main/dispatches" replace />} />
        <Route path="profile" element={<UserProfilePage />} />
      </Routes>
    </>
  );
};

export default UserMainPage;
