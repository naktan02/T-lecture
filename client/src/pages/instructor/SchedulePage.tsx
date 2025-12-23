// client/src/pages/instructor/SchedulePage.tsx
import { InstructorCalendar } from '../../features/schedule/components/InstructorCalendar';

const InstructorSchedulePage: React.FC = () => {
  return (
    <div style={{ padding: '50px', backgroundColor: '#eeeeee', minHeight: '100vh' }}>
      <h1 style={{ color: 'red' }}>캘린더 테스트 화면입니다!</h1>
      <p>아래에 달력이 보여야 합니다.</p>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
        <InstructorCalendar />
      </div>
    </div>
  );
};

export default InstructorSchedulePage;
