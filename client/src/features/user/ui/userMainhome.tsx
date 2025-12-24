// client/src/features/user/ui/userMainhome.tsx
import React from 'react';
import { Button } from '../../../shared/ui';
import { showInfo } from '../../../shared/utils';

export const UserDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">일반 유저 메인 페이지</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 카드 1: 내 정보 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
          <h3 className="text-xl font-semibold mb-2">👤 내 정보</h3>
          <p className="text-gray-600 mb-4">내 정보를 확인하고 수정합니다.</p>
          <Button onClick={() => showInfo('준비중입니다!')}>내 정보 보기</Button>
        </div>

        {/* 카드 2: 신청 현황 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
          <h3 className="text-xl font-semibold mb-2">📝 신청 현황</h3>
          <p className="text-gray-600 mb-4">강사 신청 등의 현황을 확인합니다.</p>
          <Button variant="secondary" onClick={() => showInfo('준비중입니다!')}>
            현황 보기
          </Button>
        </div>
      </div>
    </div>
  );
};
