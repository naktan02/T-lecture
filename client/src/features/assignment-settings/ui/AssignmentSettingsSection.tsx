// client/src/features/assignment-settings/ui/AssignmentSettingsSection.tsx
import { ReactElement } from 'react';

/**
 * 배정 설정 탭 - 배정 관련 기본 설정
 * TODO: 실제 설정 항목 추가 예정
 */
export const AssignmentSettingsSection = (): ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">배정 설정</h2>
        <p className="text-sm text-gray-500 mt-1">
          자동 배정 알고리즘 및 배정 관련 설정을 관리합니다.
        </p>
      </div>

      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-3">⚙️</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">준비 중</h3>
        <p className="text-sm text-gray-500">배정 설정 기능이 곧 추가될 예정입니다.</p>
      </div>
    </div>
  );
};
