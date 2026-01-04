// client/src/pages/admin/UserPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { UserWorkspace } from '../../features/userManagement';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const UserPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />
      <UserWorkspace />
    </div>
  );
};

export default UserPage;
