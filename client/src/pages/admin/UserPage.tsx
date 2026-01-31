// client/src/pages/admin/UserPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { UserWorkspace } from '../../features/userManagement';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const UserPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const refresh = usePageRefresh(['userList', 'userDetail']);

  if (!shouldRender) return <></>;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader onRefresh={refresh} />
      <UserWorkspace />
    </div>
  );
};

export default UserPage;
