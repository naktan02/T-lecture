// client/src/features/unit/ui/UnitBasicInfoTab.tsx
// 부대 기본 정보 탭 컴포넌트
// 부대명, 주소, 군구분 등 기본 정보 + 교육기간 추가/삭제

import { ChangeEvent, useState } from 'react';
import { AddressSearchInput } from '../../../shared/ui/AddressSearchInput';
import { showConfirm } from '../../../shared/utils/toast';
import { toDateInputValue } from '../../../shared/types/unit.types';

// 군 구분 타입
export type MilitaryType = 'Army' | 'Navy' | 'AirForce' | 'Marines' | 'MND';

// 교육기간 요약 정보 (기본 정보 탭에서 보여줄 리스트용)
export interface TrainingPeriodSummary {
  id?: number;
  name: string;
  startDate?: string | null; // 첫 일정 날짜
  endDate?: string | null; // 마지막 일정 날짜
  scheduleCount: number;
  locationCount: number;
}

// 기본 정보 폼 데이터
export interface UnitBasicFormData {
  name: string;
  unitType: MilitaryType;
  wideArea: string;
  region: string;
  addressDetail: string;
  detailAddress: string;
  validationStatus?: 'Valid' | 'Invalid';
  validationMessage?: string | null;
}

// 새 교육기간 폼 데이터
interface NewPeriodForm {
  name: string;
  startDate: string;
  endDate: string;
  excludedDates: string[];
}

interface UnitBasicInfoTabProps {
  formData: UnitBasicFormData;
  trainingPeriods: TrainingPeriodSummary[];
  // 전체 교육기간 데이터 (인라인 수정용)
  fullPeriodData?: {
    id?: number;
    lectureYear?: number | null;
    name: string;
    startDate?: string | null;
    endDate?: string | null;
    excludedDates?: string[];
    // 일정 데이터
    schedules: { id?: number; date: string }[];
  }[];
  onFormChange: (field: keyof UnitBasicFormData, value: string) => void;
  onAddressSave?: () => void;
  onBasicInfoSave?: () => Promise<void>;
  onPeriodAdd: (name: string, startDate: string, endDate: string, excludedDates?: string[]) => void;
  onPeriodRemove: (index: number) => void;
  onPeriodClick: (index: number) => void;
  // 인라인 수정 - 이름 변경
  onPeriodNameEdit?: (index: number, name: string) => void;
  // 일정 변경 시 별도 API 호출
  onScheduleSave?: (
    index: number,
    startDate: string,
    endDate: string,
    excludedDates: string[],
  ) => void;
  isEditMode: boolean;
}

// 날짜 포맷팅 (M/D)
const formatDateMD = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 군 구분 옵션
const MILITARY_TYPE_OPTIONS: { value: MilitaryType; label: string }[] = [
  { value: 'Army', label: '육군' },
  { value: 'Navy', label: '해군' },
  { value: 'AirForce', label: '공군' },
  { value: 'Marines', label: '해병대' },
  { value: 'MND', label: '국직부대' },
];

const EMPTY_PERIOD_FORM: NewPeriodForm = {
  name: '',
  startDate: '',
  endDate: '',
  excludedDates: [],
};

export const UnitBasicInfoTab = ({
  formData,
  trainingPeriods,
  fullPeriodData,
  onFormChange,
  onAddressSave,
  onBasicInfoSave,
  onPeriodAdd,
  onPeriodRemove,
  onPeriodClick,
  onPeriodNameEdit,
  onScheduleSave,
  isEditMode,
}: UnitBasicInfoTabProps) => {
  // 기본 정보 편집 상태
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(!isEditMode);
  const [isSavingBasicInfo, setIsSavingBasicInfo] = useState(false);

  // 인라인 교육기간 입력 폼 상태
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState<NewPeriodForm>(EMPTY_PERIOD_FORM);
  const [newExcludedDate, setNewExcludedDate] = useState('');
  // 확장된 교육기간 인덱스 (인라인 수정용)
  const [expandedPeriodIndex, setExpandedPeriodIndex] = useState<number | null>(null);

  // 인라인 수정 폼 상태 (startDate, endDate, excludedDates)
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editExcludedDates, setEditExcludedDates] = useState<string[]>([]);
  const [editExcludedDateInput, setEditExcludedDateInput] = useState('');

  // 기본 정보 저장
  const handleBasicInfoSave = async () => {
    if (!onBasicInfoSave) return;
    setIsSavingBasicInfo(true);
    try {
      await onBasicInfoSave();
      setIsEditingBasicInfo(false);
    } finally {
      setIsSavingBasicInfo(false);
    }
  };

  const hydrateEditStateFromPeriod = (periodData?: {
    startDate?: string | null;
    endDate?: string | null;
    excludedDates?: string[];
    schedules?: { date: string }[];
  }) => {
    const dates = (periodData?.schedules || [])
      .map((s) => toDateInputValue(s.date))
      .filter(Boolean)
      .sort();

    const start = periodData?.startDate ? toDateInputValue(periodData.startDate) : dates[0] || '';
    const end = periodData?.endDate
      ? toDateInputValue(periodData.endDate)
      : dates[dates.length - 1] || '';

    if (!start || !end) {
      setEditStartDate('');
      setEditEndDate('');
      setEditExcludedDates([]);
      return;
    }

    setEditStartDate(start);
    setEditEndDate(end);

    if (periodData?.excludedDates && periodData.excludedDates.length > 0) {
      setEditExcludedDates([...periodData.excludedDates].sort());
      return;
    }

    const scheduleDates = new Set(dates);
    const excluded: string[] = [];
    const current = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      if (!scheduleDates.has(dateStr)) {
        excluded.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
    setEditExcludedDates(excluded);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFormChange(name as keyof UnitBasicFormData, value);
  };

  const handleAddressSelect = (data: { address: string; sido: string; sigungu: string }) => {
    onFormChange('addressDetail', data.address);
    onFormChange('wideArea', data.sido);
    onFormChange('region', data.sigungu);
  };

  const handlePeriodFormChange = (field: keyof NewPeriodForm, value: string | string[]) => {
    setNewPeriodForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddExcludedDate = () => {
    if (newExcludedDate && !newPeriodForm.excludedDates.includes(newExcludedDate)) {
      setNewPeriodForm((prev) => ({
        ...prev,
        excludedDates: [...prev.excludedDates, newExcludedDate].sort(),
      }));
      setNewExcludedDate('');
    }
  };

  const handleRemoveExcludedDate = (date: string) => {
    setNewPeriodForm((prev) => ({
      ...prev,
      excludedDates: prev.excludedDates.filter((d) => d !== date),
    }));
  };

  const handleSubmitPeriod = () => {
    if (!newPeriodForm.name.trim() || !newPeriodForm.startDate || !newPeriodForm.endDate) return;
    onPeriodAdd(
      newPeriodForm.name.trim(),
      newPeriodForm.startDate,
      newPeriodForm.endDate,
      newPeriodForm.excludedDates.length > 0 ? newPeriodForm.excludedDates : undefined,
    );
    setNewPeriodForm(EMPTY_PERIOD_FORM);
    setIsAddingPeriod(false);
  };

  const handleCancelPeriod = () => {
    setNewPeriodForm(EMPTY_PERIOD_FORM);
    setIsAddingPeriod(false);
  };

  return (
    <div className="space-y-6 p-4">
      {/* 기본 정보 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            🏢 기본 정보
          </h4>
          {isEditMode && (
            <div className="flex items-center gap-2">
              {isEditingBasicInfo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingBasicInfo(false)}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                    disabled={isSavingBasicInfo}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleBasicInfoSave}
                    className="px-4 py-1.5 text-sm font-medium bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={isSavingBasicInfo}
                  >
                    {isSavingBasicInfo ? '저장 중...' : '저장'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingBasicInfo(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 부대명 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              부대명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isEditMode && !isEditingBasicInfo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="부대명 입력"
            />
          </div>

          {/* 군 구분 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              군 구분 <span className="text-red-500">*</span>
            </label>
            <select
              name="unitType"
              value={formData.unitType}
              onChange={handleChange}
              disabled={isEditMode && !isEditingBasicInfo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
            >
              {MILITARY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 광역 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">광역</label>
            <input
              type="text"
              name="wideArea"
              value={formData.wideArea}
              onChange={handleChange}
              disabled={isEditMode && !isEditingBasicInfo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="광역 입력"
            />
          </div>

          {/* 지역 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">지역</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              disabled={isEditMode && !isEditingBasicInfo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="지역 입력"
            />
          </div>
        </div>

        {/* 부대주소 */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-1">부대주소</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <AddressSearchInput
                value={formData.addressDetail}
                onChange={(val) => onFormChange('addressDetail', val)}
                onSelect={handleAddressSelect}
              />
            </div>
            {isEditMode && onAddressSave && (
              <button
                type="button"
                onClick={onAddressSave}
                className="px-2 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
              >
                저장
              </button>
            )}
          </div>
        </div>

        {/* 상세주소 */}
        <div className="mt-4">
          <label className="block text-xs text-gray-500 mb-1">상세주소</label>
          <input
            type="text"
            name="detailAddress"
            value={formData.detailAddress}
            onChange={handleChange}
            disabled={isEditMode && !isEditingBasicInfo}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
            placeholder="상세주소 입력 (예: 301동 근무대대 강당)"
          />
        </div>
      </div>

      {/* 교육기간 관리 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            📅 교육기간 관리
          </h4>
          {!isAddingPeriod && (
            <button
              type="button"
              onClick={() => setIsAddingPeriod(true)}
              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              + 교육기간 추가
            </button>
          )}
        </div>

        {/* 인라인 교육기간 추가 폼 */}
        {isAddingPeriod && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 이름 */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">
                  교육기간명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPeriodForm.name}
                  onChange={(e) => handlePeriodFormChange('name', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="예: 정규교육, 추가교육 1차"
                  autoFocus
                />
              </div>
              {/* 시작일 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPeriodForm.startDate}
                  onChange={(e) => handlePeriodFormChange('startDate', e.target.value)}
                  max="2035-12-31"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              {/* 종료일 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPeriodForm.endDate}
                  onChange={(e) => handlePeriodFormChange('endDate', e.target.value)}
                  max="2035-12-31"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              {/* 불가일자 */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">
                  교육불가일자 ({newPeriodForm.excludedDates.length}개)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newExcludedDate}
                    onChange={(e) => setNewExcludedDate(e.target.value)}
                    max="2035-12-31"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddExcludedDate}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                  >
                    추가
                  </button>
                </div>
                {newPeriodForm.excludedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newPeriodForm.excludedDates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"
                      >
                        {date}
                        <button
                          type="button"
                          onClick={() => handleRemoveExcludedDate(date)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 버튼 */}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleCancelPeriod}
                className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmitPeriod}
                disabled={
                  !newPeriodForm.name.trim() || !newPeriodForm.startDate || !newPeriodForm.endDate
                }
                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {trainingPeriods.length === 0 && !isAddingPeriod ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            등록된 교육기간이 없습니다.
            <br />
            교육기간을 추가하면 오른쪽에 탭이 생성됩니다.
          </p>
        ) : (
          <div className="space-y-2">
            {trainingPeriods.map((period, index) => {
              const isExpanded = expandedPeriodIndex === index;
              const periodData = fullPeriodData?.[index];

              return (
                <div key={period.id ?? `period-${index}`}>
                  {/* 교육기간 행 */}
                  <div
                    className={`p-3 rounded-lg transition cursor-pointer ${
                      isExpanded
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedPeriodIndex(null);
                      } else {
                        if (periodData) {
                          hydrateEditStateFromPeriod(periodData);
                        }
                        setExpandedPeriodIndex(index);
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800">{period.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateMD(period.startDate)} ~ {formatDateMD(period.endDate)}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {period.scheduleCount}일
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          장소 {period.locationCount}개
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isExpanded) {
                              setExpandedPeriodIndex(null);
                            } else {
                              if (periodData) {
                                hydrateEditStateFromPeriod(periodData);
                              }
                              setExpandedPeriodIndex(index);
                            }
                          }}
                          className="text-blue-500 hover:text-blue-700 text-sm px-2"
                        >
                          {isExpanded ? '접기' : '수정'}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await showConfirm(
                              `"${period.name}" 교육기간을 삭제하시겠습니까?`,
                            );
                            if (confirmed) {
                              onPeriodRemove(index);
                              if (expandedPeriodIndex === index) {
                                setExpandedPeriodIndex(null);
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm px-2"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 인라인 수정 폼 */}
                  {isExpanded && periodData && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 이름 */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">교육기간명</label>
                          <input
                            type="text"
                            value={periodData.name}
                            onChange={(e) => onPeriodNameEdit?.(index, e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                            placeholder="예: 정규교육"
                          />
                        </div>
                        {/* 시작일 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">시작일</label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            max="2035-12-31"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        {/* 종료일 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">종료일</label>
                          <input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            max="2035-12-31"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        {/* 불가일자 */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">
                            교육불가일자 ({editExcludedDates.length}개)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={editExcludedDateInput}
                              onChange={(e) => setEditExcludedDateInput(e.target.value)}
                              max="2035-12-31"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  editExcludedDateInput &&
                                  !editExcludedDates.includes(editExcludedDateInput)
                                ) {
                                  setEditExcludedDates((prev) =>
                                    [...prev, editExcludedDateInput].sort(),
                                  );
                                  setEditExcludedDateInput('');
                                }
                              }}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                            >
                              추가
                            </button>
                          </div>
                          {editExcludedDates.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {editExcludedDates.map((date) => (
                                <span
                                  key={date}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"
                                >
                                  {date}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditExcludedDates((prev) => prev.filter((d) => d !== date))
                                    }
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 버튼 */}
                      <div className="flex justify-between pt-3 mt-3 border-t border-blue-200">
                        <button
                          type="button"
                          onClick={() => onPeriodClick(index)}
                          className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          근무시간/장소 상세 수정 →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const start =
                              editStartDate || toDateInputValue(periodData.schedules[0]?.date);
                            const end =
                              editEndDate ||
                              toDateInputValue(
                                periodData.schedules[periodData.schedules.length - 1]?.date,
                              );
                            if (start && end) {
                              onScheduleSave?.(index, start, end, editExcludedDates);
                              setExpandedPeriodIndex(null);
                              setEditStartDate('');
                              setEditEndDate('');
                              setEditExcludedDates([]);
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          일정 수정
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
