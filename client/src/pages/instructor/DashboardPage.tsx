// client/src/pages/instructor/DashboardPage.tsx
import { UserDashboardPage } from '../../features/dashboard/ui/UserDashboardPage';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const InstructorDashboardPage: React.FC = () => {
  // 강사 전용 페이지
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  if (!shouldRender) return null;

  return (
    <>
      <UserHeader />
      <ContentWrapper>
        <UserDashboardPage />
      </ContentWrapper>
    </>
  );
};

export default InstructorDashboardPage;
