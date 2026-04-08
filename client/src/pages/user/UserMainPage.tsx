// src/pages/user/UserMainPage.tsx
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserProfilePage from './UserProfilePage';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const UserMainPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) return null;

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
