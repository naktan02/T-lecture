// src/pages/admin/AdminPage.tsx
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { ContentWrapper } from '../../shared/ui';
import { AdminDashboard } from '../../features/admin/ui/AdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return null;

  return (
    <>
      <AdminHeader />
      <ContentWrapper>
        <AdminDashboard />
      </ContentWrapper>
    </>
  );
};

export default AdminPage;
