import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button'; // 기존 버튼 재사용

export const InstructorDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">강사 메인 페이지</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
            {/* 카드 1: 스케줄 관리 */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-xl font-semibold mb-2">📅 스케줄 관리</h3>
            <p className="text-gray-600 mb-4">강의 가능한 날짜를 등록하고 확인합니다.</p>
            <Button onClick={() => navigate('/schedule')}>
                스케줄 등록하러 가기
            </Button>
            </div>

            {/* 카드 2: 배정된 강의 */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-xl font-semibold mb-2">🏫 배정된 강의</h3>
            <p className="text-gray-600 mb-4">확정된 강의 일정을 확인합니다.</p>
            <Button variant="secondary" onClick={() => alert('아직 준비중입니다!')}>
                강의 목록 보기
            </Button>
            </div>
        </div>
        </div>
    );
};