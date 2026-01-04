// src/pages/admin/AdminPage.tsx
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { AdminDashboard } from '../../features/admin/ui/AdminDashboard';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AdminPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminDashboard />
    </div>
  );
};

export default AdminPage;
