// client/src/pages/admin/NoticePage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { NoticeWorkspace } from '../../features/notice';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AdminNoticePage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />
      <NoticeWorkspace />
    </div>
  );
};

export default AdminNoticePage;
