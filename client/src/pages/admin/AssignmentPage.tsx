// src/pages/admin/AssignmentPage.tsx
import { useState, useCallback } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { ContentWrapper } from '../../shared/ui';
import { AssignmentWorkspace } from '../../features/assignment/ui/AssignmentWorkspace';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AssignmentPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  const [refresh, setRefresh] = useState<(() => void) | null>(null);

  const handleRefreshReady = useCallback((fn: () => void) => {
    setRefresh(() => fn);
  }, []);

  if (!shouldRender) return null;

  return (
    <>
      <AdminHeader onRefresh={refresh ?? undefined} />
      <ContentWrapper scrollable={false}>
        <AssignmentWorkspace onRefreshReady={handleRefreshReady} />
      </ContentWrapper>
    </>
  );
};

export default AssignmentPage;
