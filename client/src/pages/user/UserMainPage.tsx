// src/pages/user/UserMainPage.tsx
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserProfilePage from './UserProfilePage';
import { UserDashboard } from '../../features/user/ui/userMainhome';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const UserMainPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) return null;

  return (
    <>
      <UserHeader />
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <ContentWrapper>
              <UserDashboard />
            </ContentWrapper>
          }
        />
        <Route path="profile" element={<UserProfilePage />} />
      </Routes>
    </>
  );
};

export default UserMainPage;
