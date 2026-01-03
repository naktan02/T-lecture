// client/src/pages/admin/AssignmentSettingsPage.tsx
import { ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { ContentWrapper } from '../../shared/ui';
import { AssignmentSettingsTabs } from '../../features/assignment-settings/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const AssignmentSettingsPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('ADMIN');
  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <AdminHeader />
      <ContentWrapper scrollable={false}>
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">배정 설정</h1>
            <p className="text-sm text-gray-500 mt-1">
              배정 알고리즘, 패널티, 메시지 템플릿 등을 관리합니다.
            </p>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <AssignmentSettingsTabs />
          </div>
        </div>
      </ContentWrapper>
    </div>
  );
};

export default AssignmentSettingsPage;
