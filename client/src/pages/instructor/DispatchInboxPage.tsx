// client/src/pages/instructor/DispatchInboxPage.tsx
import { DispatchInbox } from '../../features/dispatch/ui/DispatchInbox';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const DispatchInboxPage: React.FC = () => {
  // 로그인 사용자 전용 페이지
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) return null;

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
