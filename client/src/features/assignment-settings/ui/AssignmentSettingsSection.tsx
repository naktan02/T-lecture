// client/src/features/assignment-settings/ui/AssignmentSettingsSection.tsx
import { ReactElement, useState, useEffect, useRef } from 'react';
import { useAssignmentSettings } from '../model/useAssignmentSettings';

// 설정 항목 정의
const CONFIG_ITEMS = [
  {
    key: 'TRAINEES_PER_INSTRUCTOR',
    label: '강사당 교육생 수',
    description: '자동 배정 시 강사 1명당 담당할 교육생 수',
    unit: '명',
    min: 1,
    max: 100,
  },
  {
    key: 'REJECTION_PENALTY_DAYS',
    label: '거절 패널티 기간',
    description: '배정 거절 시 패널티가 연장되는 일수',
    unit: '일',
    min: 1,
    max: 90,
  },
  {
    key: 'INTERN_MAX_DISTANCE_KM',
    label: '실습강사 제한 거리',
    description: '실습강사가 배정될 수 있는 최대 거리',
    unit: 'km',
    min: 10,
    max: 200,
  },
  {
    key: 'SUB_MAX_DISTANCE_KM',
    label: '보조강사 제한 거리',
    description: '보조강사가 배정될 수 있는 최대 거리 (0 = 제한 없음)',
    unit: 'km',
    min: 0,
    max: 200,
  },
] as const;

/**
 * 배정 설정 탭 - 배정 관련 기본 설정
 */
export const AssignmentSettingsSection = (): ReactElement => {
  const { configs, isLoading, updateConfig, isUpdating } = useAssignmentSettings();

  // 로컬 폼 상태
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const isInitialized = useRef(false);

  // 서버 데이터로 폼 초기화 (한 번만)
  useEffect(() => {
    if (configs.length > 0 && !isInitialized.current) {
      const values: Record<string, string> = {};
      CONFIG_ITEMS.forEach((item) => {
        const config = configs.find((c) => c.key === item.key);
        values[item.key] = config?.value ?? '';
      });
      setFormValues(values);
      setOriginalValues(values);
      isInitialized.current = true;
    }
  }, [configs]);

  // 변경 여부 확인
  const hasChanges = CONFIG_ITEMS.some((item) => formValues[item.key] !== originalValues[item.key]);

  // 값 변경 핸들러
  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // 취소 - 원래 값으로 복원
  const handleCancel = () => {
    setFormValues({ ...originalValues });
  };

  // 저장
  const handleSave = () => {
    CONFIG_ITEMS.forEach((item) => {
      const value = formValues[item.key];
      if (value && value !== originalValues[item.key]) {
        updateConfig({ key: item.key, value });
      }
    });
    setOriginalValues({ ...formValues });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">배정 설정</h2>
        <p className="text-sm text-gray-500 mt-1">
          자동 배정 알고리즘 및 배정 관련 설정을 관리합니다.
        </p>
      </div>

      {/* 설정 항목들 */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {CONFIG_ITEMS.map((item) => (
          <div key={item.key} className="p-5">
            <div className="flex flex-col gap-3">
              {/* 라벨 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">{item.label}</label>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
              {/* 입력 필드 (왼쪽 정렬) */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formValues[item.key] ?? ''}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  min={item.min}
                  max={item.max}
                  className="w-24 px-3 py-2 text-center border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">{item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 저장/취소 버튼 */}
      {hasChanges && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg 
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-blue-500 text-xl">ℹ️</span>
          <div>
            <p className="text-sm text-blue-800 font-medium">설정 변경 안내</p>
            <p className="text-xs text-blue-600 mt-1">
              설정 변경 후 새로운 자동 배정에 적용됩니다. 기존 배정에는 영향을 주지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
