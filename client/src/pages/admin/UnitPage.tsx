// client/src/pages/admin/UnitPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { UnitWorkspace } from '../../features/unit';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';
import { LoadingSpinner } from '../../shared/ui';

const UnitPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const refresh = usePageRefresh(['unitList', 'unitDetail']);

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="관리자 권한을 확인하는 중입니다." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader onRefresh={refresh} />
      <UnitWorkspace />
    </div>
  );
};

export default UnitPage;
