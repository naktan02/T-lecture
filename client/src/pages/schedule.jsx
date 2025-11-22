// client/src/pages/schedule.jsx
import React from 'react';
// 경로가 맞는지 확인하세요 (features 폴더가 src 안에 있어야 함)
import { InstructorCalendar } from '../features/schedule/components/InstructorCalendar';

const InstructorSchedulePage = () => {
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