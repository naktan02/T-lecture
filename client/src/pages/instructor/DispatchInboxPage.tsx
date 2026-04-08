// client/src/pages/instructor/DispatchInboxPage.tsx
import { DispatchInbox } from '../../features/dispatch/ui/DispatchInbox';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const DispatchInboxPage: React.FC = () => {
  // 로그인 사용자 전용 페이지
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <UserHeader />
      <ContentWrapper>
        <DispatchInbox />
      </ContentWrapper>
    </>
  );
};

export default DispatchInboxPage;
