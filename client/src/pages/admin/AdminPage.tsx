// src/pages/admin/AdminPage.tsx
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { AdminDashboard } from '../../features/admin/ui/AdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';
import { LoadingSpinner } from '../../shared/ui';

const AdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const refresh = usePageRefresh(['admin-dashboard']);
  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="관리자 권한을 확인하는 중입니다." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onRefresh={refresh} />
      <AdminDashboard />
    </div>
  );
};

export default AdminPage;
