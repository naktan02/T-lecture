// client/src/features/unit/ui/UnitDetailDrawerV2.tsx
// TrainingPeriod 기반 동적 탭 구조의 부대 상세 Drawer
// 리팩토링: useUnitDrawer 훅 사용

import { FormEvent } from 'react';
import { UnitData } from '../api/unitApi';
import { useUnitDrawer } from '../model/useUnitDrawer';
import { UnitBasicInfoTab } from './UnitBasicInfoTab';
import { TrainingPeriodTab } from './TrainingPeriodTab';

// ========== Types ==========

interface UnitDetailDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  unit: { id: number } | null;
  onRegister?: (data: UnitData) => Promise<unknown> | void;
  onUpdate?: (params: { id: number | string; data: unknown }) => void;
  onDelete?: (id: number) => void;
}

// ========== Component ==========

export const UnitDetailDrawerV2 = ({
  isOpen,
  onClose,
  unit: initialUnit,
  onRegister,
  onUpdate: _onUpdate,
  onDelete,
}: UnitDetailDrawerV2Props) => {
  const {
    // State
    activeTab,
    setActiveTab,
    basicForm,
    trainingPeriods,

    // Derived
    periodSummaries,

    // Handlers
    handleBasicFormChange,
    handleAddPeriod,
    handleRemovePeriod,
    handlePeriodClick,
    handlePeriodChange,
    handleLocationUpdate,
    handleLocationAdd,
    handleLocationRemove,
    handleScheduleLocationRowAdd,
    handleScheduleLocationRowRemove,
    handleScheduleLocationRowChange,
    handleApplyFirstToAll,
    handleInfoSave,
    handleLocationsSave,
    handleBasicInfoSave,
    handleSaveAddress,
    handleSubmit,
    handleScheduleSave,
    handlePeriodNameEdit,
    handleCancelLocations,

    // Status
    isEditMode,
  } = useUnitDrawer({
    unitId: initialUnit?.id,
    isOpen,
    onRegister,
    onDelete,
    onClose,
  });

  const onFormSubmit = (e: FormEvent) => {
    handleSubmit(e);
  };

  if (!isOpen) return null;

  // ===== Render =====
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">{/* ... existing header content ... */}</div>
          {/* ... */}
        </div>

        {/* Validation Warning Alert */}
        {basicForm.validationStatus === 'Invalid' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 mb-0">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <span className="font-bold">데이터 검증 오류:</span>{' '}
                  {basicForm.validationMessage || '알 수 없는 오류'}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  데이터를 수정하고 저장하면 검증 상태가 &apos;Valid&apos;로 변경됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs - 동적 생성 */}
        <div className="flex border-b bg-gray-50 shrink-0 overflow-x-auto">
          {/* 기본 정보 탭 */}
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`min-w-[100px] py-3 px-4 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'basic'
                ? 'border-green-500 text-green-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            기본 정보
          </button>

          {/* 교육기간별 동적 탭 */}
          {trainingPeriods.map((period, idx) => (
            <button
              key={period.id ?? `period-${idx}`}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`min-w-[100px] py-3 px-4 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                activeTab === idx
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {period.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <form id="unit-form" onSubmit={onFormSubmit}>
            {/* 기본 정보 탭 */}
            {activeTab === 'basic' && (
              <UnitBasicInfoTab
                formData={basicForm}
                trainingPeriods={periodSummaries}
                fullPeriodData={trainingPeriods.map((p) => ({
                  id: p.id,
                  name: p.name,
                  schedules: p.schedules,
                }))}
                onFormChange={handleBasicFormChange}
                onAddressSave={handleSaveAddress}
                onBasicInfoSave={handleBasicInfoSave}
                onPeriodAdd={handleAddPeriod}
                onPeriodRemove={handleRemovePeriod}
                onPeriodClick={handlePeriodClick}
                onPeriodNameEdit={handlePeriodNameEdit}
                onScheduleSave={handleScheduleSave}
                isEditMode={isEditMode}
              />
            )}

            {/* 교육기간 탭들 */}
            {typeof activeTab === 'number' && trainingPeriods[activeTab] && (
              <TrainingPeriodTab
                data={trainingPeriods[activeTab]}
                onChange={handlePeriodChange}
                onLocationUpdate={handleLocationUpdate}
                onLocationAdd={handleLocationAdd}
                onLocationRemove={handleLocationRemove}
                onScheduleLocationRowAdd={handleScheduleLocationRowAdd}
                onScheduleLocationRowRemove={handleScheduleLocationRowRemove}
                onScheduleLocationRowChange={handleScheduleLocationRowChange}
                onApplyFirstToAll={handleApplyFirstToAll}
                onInfoSave={handleInfoSave}
                onLocationsSave={handleLocationsSave}
                onCancelLocations={handleCancelLocations}
              />
            )}
          </form>
        </div>
      </div>
    </>
  );
};
