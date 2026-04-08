// client/src/pages/instructor/DashboardPage.tsx
import { UserDashboardPage } from '../../features/dashboard/ui/UserDashboardPage';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const InstructorDashboardPage: React.FC = () => {
  // 강사 전용 페이지
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const refresh = usePageRefresh(['user-dashboard-stats', 'user-dashboard-activities']);

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <UserHeader onRefresh={refresh} />
      <ContentWrapper>
        <UserDashboardPage />
      </ContentWrapper>
    </>
  );
};

export default InstructorDashboardPage;
