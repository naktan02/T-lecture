// src/pages/admin/AdminPage.tsx
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { AdminDashboard } from '../../features/admin/ui/AdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const AdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const refresh = usePageRefresh(['admin-dashboard']);
  if (!shouldRender) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onRefresh={refresh} />
      <AdminDashboard />
    </div>
  );
};

export default AdminPage;
