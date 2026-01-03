// client/src/pages/admin/UnitPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { UnitWorkspace } from '../../features/unit';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const UnitPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />
      <UnitWorkspace />
    </div>
  );
};

export default UnitPage;
