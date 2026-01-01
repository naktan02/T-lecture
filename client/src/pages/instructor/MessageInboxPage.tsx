// client/src/pages/instructor/MessageInboxPage.tsx
import { MessageInbox } from '../../features/message/ui/MessageInbox';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const MessageInboxPage: React.FC = () => {
  // 로그인 사용자 전용 페이지
  const { shouldRender } = useAuthGuard('USER');
  if (!shouldRender) return null;

  return (
    <>
      <UserHeader />
      <ContentWrapper>
        <MessageInbox />
      </ContentWrapper>
    </>
  );
};

export default MessageInboxPage;
