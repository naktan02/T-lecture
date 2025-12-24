// src/pages/user/UserMainPage.tsx
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { UserDashboard } from '../../features/user/ui/userMainhome';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const UserMainPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) return null;

  return (
    <>
      <UserHeader />
      <ContentWrapper>
        <UserDashboard />
      </ContentWrapper>
    </>
  );
};

export default UserMainPage;
