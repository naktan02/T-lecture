// client/src/pages/admin/NoticePage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { NoticeWorkspace } from '../../features/notice';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const AdminNoticePage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const refresh = usePageRefresh(['noticeList']);

  if (!shouldRender) return <></>;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader onRefresh={refresh} />
      <NoticeWorkspace />
    </div>
  );
};

export default AdminNoticePage;
