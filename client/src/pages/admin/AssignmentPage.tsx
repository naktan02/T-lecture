// src/pages/admin/AssignmentPage.tsx
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { ContentWrapper } from '../../shared/ui';
import { AssignmentWorkspace } from '../../features/assignment/ui/AssignmentWorkspace';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AssignmentPage: React.FC = () => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return null;

  return (
    <>
      <AdminHeader />
      <ContentWrapper scrollable={false}>
        <AssignmentWorkspace />
      </ContentWrapper>
    </>
  );
};

export default AssignmentPage;
