import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns'; // 날짜 포맷팅 도구
import 'react-calendar/dist/Calendar.css'; // 라이브러리 기본 스타일

import { postAvailability } from '../../../lib/api/schedule';

export const InstructorCalendar = () => {
  const [selectedDates, setSelectedDates] = useState([]); // 선택된 날짜들 저장

  // 날짜 클릭했을 때 실행되는 함수
  const handleDateClick = (value) => {
    // 클릭한 날짜를 "YYYY-MM-DD" 문자열로 변환
    const dateStr = format(value, 'yyyy-MM-dd');

    if (selectedDates.includes(dateStr)) {
      // 이미 선택된 날짜면 -> 목록에서 제거 (취소)
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      // 없는 날짜면 -> 목록에 추가
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  // '등록하기' 버튼 눌렀을 때
  const handleSubmit = async () => {
    if (selectedDates.length === 0) {
      alert("날짜를 하나 이상 선택해주세요!");
      return;
    }

    try {
      await postAvailability(selectedDates); // API 호출
      alert("성공! 스케줄이 등록되었습니다.");
      setSelectedDates([]); // 선택 초기화
    } catch (error) {
      console.error(error);
      alert("실패: " + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h2>📅 강의 가능 날짜 선택</h2>
      <p>원하는 날짜를 클릭해서 선택하세요 (다중 선택 가능)</p>
      
      <Calendar 
        onClickDay={handleDateClick}
        // 선택된 날짜에 CSS 클래스 붙이기
        tileClassName={({ date, view }) => {
          if (view === 'month') {
            const dateStr = format(date, 'yyyy-MM-dd');
            // 선택된 날짜 목록에 있으면 'selected-date' 클래스 적용
            if (selectedDates.includes(dateStr)) return 'selected-date';
          }
        }}
      />

      <div style={{ marginTop: '15px' }}>
        <strong>선택된 날짜: {selectedDates.length}일</strong>
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        스케줄 등록하기
      </button>
    </div>
  );
};