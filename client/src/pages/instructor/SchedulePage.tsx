// client/src/pages/instructor/SchedulePage.tsx
import { InstructorCalendar } from '../../features/schedule/ui/InstructorCalendar';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const InstructorSchedulePage: React.FC = () => {
  // 강사 전용 페이지
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const refresh = usePageRefresh(['instructorSchedule']);

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <>
      <UserHeader onRefresh={refresh} />
      <ContentWrapper noPadding={true} scrollable={true}>
        <InstructorCalendar />
      </ContentWrapper>
    </>
  );
};

export default InstructorSchedulePage;
