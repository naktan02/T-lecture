// src/pages/admin/SuperAdminPage.tsx
import { SuperAdminHeader } from '../../features/admin/ui/headers/SuperAdminHeader';
import { ContentWrapper } from '../../shared/ui';
import { SuperAdminDashboard } from '../../features/admin/ui/SuperAdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const SuperAdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('SUPER_ADMIN');
  if (!shouldRender) return null;

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
