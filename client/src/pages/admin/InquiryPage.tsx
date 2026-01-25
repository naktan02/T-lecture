// client/src/pages/admin/InquiryPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { InquiryWorkspace } from '../../features/inquiry';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AdminInquiryPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return <></>;

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <InquiryWorkspace />
    </div>
  );
};

export default AdminInquiryPage;
