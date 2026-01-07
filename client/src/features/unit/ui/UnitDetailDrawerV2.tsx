// client/src/features/unit/ui/UnitDetailDrawerV2.tsx
// TrainingPeriod 기반 동적 탭 구조의 부대 상세 Drawer
// 리팩토링: useUnitDrawer 훅 사용

import { FormEvent } from 'react';
import { UnitData } from '../api/unitApi';
import { Button } from '../../../shared/ui';
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

    // Computed
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
    handleScheduleLocationsSave,
    handleSaveAddress,
    handleSubmit,
    handleDelete,
    handleScheduleSave,
    handlePeriodNameEdit,

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
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg md:text-xl font-bold">
              {initialUnit ? '부대 정보 수정' : '신규 부대 등록'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

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
                onScheduleLocationsSave={handleScheduleLocationsSave}
              />
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between shrink-0">
          {initialUnit && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <button
              type="submit"
              form="unit-form"
              className="px-5 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
