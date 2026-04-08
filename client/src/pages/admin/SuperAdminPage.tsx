// src/pages/admin/SuperAdminPage.tsx
import { SuperAdminHeader } from '../../features/admin/ui/headers/SuperAdminHeader';
import { ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { SuperAdminDashboard } from '../../features/admin/ui/SuperAdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const SuperAdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('SUPER_ADMIN');
  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="최고 관리자 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <SuperAdminHeader />
      <ContentWrapper>
        <SuperAdminDashboard />
      </ContentWrapper>
    </>
  );
};

export default SuperAdminPage;
