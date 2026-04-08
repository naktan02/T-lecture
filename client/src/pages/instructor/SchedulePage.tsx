// client/src/pages/instructor/SchedulePage.tsx
import { InstructorCalendar } from '../../features/schedule/ui/InstructorCalendar';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { ContentWrapper } from '../../shared/ui';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { usePageRefresh } from '../../shared/hooks/usePageRefresh';

const InstructorSchedulePage: React.FC = () => {
  // 강사 전용 페이지
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const refresh = usePageRefresh(['instructorSchedule']);

  if (!shouldRender) return null;

  return (
    <>
      <UserHeader onRefresh={refresh} />
      <ContentWrapper scrollable={true}>
        <InstructorCalendar />
      </ContentWrapper>
    </>
  );
};

export default InstructorSchedulePage;
