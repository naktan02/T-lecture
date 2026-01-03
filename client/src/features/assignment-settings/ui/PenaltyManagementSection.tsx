// client/src/features/assignment-settings/ui/PenaltyManagementSection.tsx
import { ReactElement } from 'react';

/**
 * 배정 패널티 관리 탭 - 강사별 패널티/우선순위 관리
 * TODO: 실제 패널티 관리 기능 추가 예정
 */
export const PenaltyManagementSection = (): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">배정 패널티 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          강사별 배정 패널티 및 우선순위 크레딧을 관리합니다.
        </p>
      </div>

      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">준비 중</h3>
        <p className="text-sm text-gray-500">패널티 관리 기능이 곧 추가될 예정입니다.</p>
      </div>
    </div>
  );
};
