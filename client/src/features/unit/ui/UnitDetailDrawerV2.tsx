// client/src/features/unit/ui/UnitDetailDrawerV2.tsx
// TrainingPeriod 기반 동적 탭 구조의 부대 상세 Drawer
// 기존 UnitDetailDrawer.tsx를 대체할 새 버전

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { Button } from '../../../shared/ui';
import { showError, showSuccess, showWarning } from '../../../shared/utils/toast';
import {
  UnitBasicInfoTab,
  UnitBasicFormData,
  TrainingPeriodSummary,
  MilitaryType,
} from './UnitBasicInfoTab';
import {
  TrainingPeriodTab,
  TrainingPeriodFormData,
  ScheduleLocationFormData,
} from './TrainingPeriodTab';
import { LocationData } from './LocationAccordion';
import {
  Unit,
  TrainingPeriod,
  TrainingLocation,
  toDateInputValue,
  UpdateUnitWithPeriodsPayload,
} from '../../../shared/types/unit.types';

// ========== Types ==========

interface UnitDetailDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  unit: { id: number } | null; // 수정 시 전달, 신규 시 null
  onRegister?: (data: UnitData) => Promise<unknown> | void;
  onUpdate?: (params: { id: number | string; data: unknown }) => void;
  onDelete?: (id: number) => void;
}

// API 응답 wrapper
interface ApiEnvelope<T> {
  result?: string;
  data: T;
}

// ========== Helpers ==========

const createEmptyLocation = (): LocationData => ({
  originalPlace: '',
  changedPlace: '',
  hasInstructorLounge: false,
  hasWomenRestroom: false,
  note: '',
});

const createEmptyPeriod = (name: string): TrainingPeriodFormData => ({
  name,
  workStartTime: '09:00',
  workEndTime: '18:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:00',
  officerName: '',
  officerPhone: '',
  officerEmail: '',
  hasCateredMeals: false,
  hasHallLodging: false,
  allowsPhoneBeforeAfter: false,
  locations: [],
  schedules: [],
  scheduleLocationMap: {},
});

// Date -> HH:mm
const toTimeString = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

// TrainingLocation -> LocationData
const mapLocationToForm = (loc: TrainingLocation): LocationData => ({
  id: loc.id,
  originalPlace: loc.originalPlace || '',
  changedPlace: loc.changedPlace || '',
  hasInstructorLounge: loc.hasInstructorLounge || false,
  hasWomenRestroom: loc.hasWomenRestroom || false,
  note: loc.note || '',
});

// TrainingPeriod -> TrainingPeriodFormData
const mapPeriodToForm = (period: TrainingPeriod): TrainingPeriodFormData => {
  const scheduleLocationMap: Record<number | string, ScheduleLocationFormData[]> = {};
  (period.schedules || []).forEach((s, idx) => {
    const key = s.id ?? `new-${idx}`;
    scheduleLocationMap[key] = (s.scheduleLocations || []).map((sl) => ({
      trainingLocationId: sl.trainingLocationId,
      plannedCount: sl.plannedCount ?? null,
      actualCount: sl.actualCount ?? null,
    }));
  });

  // 배정된 강사가 있는지 확인 (schedules에서 assignments 확인)
  const hasAssignments = (period.schedules || []).some(
    (s) => s.assignments && s.assignments.length > 0,
  );

  return {
    id: period.id,
    name: period.name,
    workStartTime: toTimeString(period.workStartTime),
    workEndTime: toTimeString(period.workEndTime),
    lunchStartTime: toTimeString(period.lunchStartTime),
    lunchEndTime: toTimeString(period.lunchEndTime),
    officerName: period.officerName || '',
    officerPhone: period.officerPhone || '',
    officerEmail: period.officerEmail || '',
    hasCateredMeals: period.hasCateredMeals || false,
    hasHallLodging: period.hasHallLodging || false,
    allowsPhoneBeforeAfter: period.allowsPhoneBeforeAfter || false,
    locations: (period.locations || []).map(mapLocationToForm),
    schedules: (period.schedules || []).map((s) => ({
      id: s.id,
      date: toDateInputValue(s.date),
    })),
    scheduleLocationMap,
    hasAssignments,
  };
};

// ========== Component ==========

export const UnitDetailDrawerV2 = ({
  isOpen,
  onClose,
  unit: initialUnit,
  onRegister,
  onUpdate: _onUpdate, // 수정 모드에서는 직접 API 호출
  onDelete,
}: UnitDetailDrawerV2Props) => {
  const queryClient = useQueryClient();
  const unitId = initialUnit?.id;

  // ===== State =====
  const [activeTab, setActiveTab] = useState<'basic' | number>('basic'); // 'basic' 또는 교육기간 index
  const [basicForm, setBasicForm] = useState<UnitBasicFormData>({
    name: '',
    unitType: 'Army',
    wideArea: '',
    region: '',
    addressDetail: '',
    detailAddress: '',
  });
  const [trainingPeriods, setTrainingPeriods] = useState<TrainingPeriodFormData[]>([]);

  // ===== API Query =====
  const { data: detailData, isSuccess } = useQuery<ApiEnvelope<Unit>>({
    queryKey: ['unitDetail', unitId],
    queryFn: () => unitApi.getUnit(unitId as number),
    enabled: Boolean(unitId) && isOpen,
    staleTime: 0,
  });

  // ===== Data Binding =====
  useEffect(() => {
    if (!isOpen) return;

    if (!initialUnit) {
      // 신규 등록 모드
      setBasicForm({
        name: '',
        unitType: 'Army',
        wideArea: '',
        region: '',
        addressDetail: '',
        detailAddress: '',
      });
      setTrainingPeriods([]);
      setActiveTab('basic');
      return;
    }

    // 수정 모드 - 서버 데이터 바인딩
    const unitData = detailData?.data;
    if (!unitData) return;

    setBasicForm({
      name: unitData.name || '',
      unitType: (unitData.unitType as MilitaryType) || 'Army',
      wideArea: unitData.wideArea || '',
      region: unitData.region || '',
      addressDetail: unitData.addressDetail || '',
      detailAddress: unitData.detailAddress || '',
    });

    const periods = (unitData.trainingPeriods || []).map(mapPeriodToForm);
    setTrainingPeriods(periods);
    setActiveTab('basic');
  }, [isOpen, initialUnit, detailData, isSuccess]);

  // ===== Computed =====
  const periodSummaries: TrainingPeriodSummary[] = useMemo(() => {
    return trainingPeriods.map((p) => {
      const dates = p.schedules
        .map((s) => s.date)
        .filter(Boolean)
        .sort();
      return {
        id: p.id,
        name: p.name,
        startDate: dates[0] || null,
        endDate: dates[dates.length - 1] || null,
        scheduleCount: p.schedules.length,
        locationCount: p.locations.length,
      };
    });
  }, [trainingPeriods]);

  // ===== Handlers =====
  const handleBasicFormChange = (field: keyof UnitBasicFormData, value: string) => {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPeriod = async (
    name: string,
    startDate?: string,
    endDate?: string,
    excludedDates?: string[],
  ) => {
    // 새 교육기간 생성 (날짜 범위로 일정 자동 생성)
    const newPeriod = createEmptyPeriod(name);

    // 시작일과 종료일이 있으면 일정 자동 생성
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      const schedules: { date: string }[] = [];
      const excluded = new Set(excludedDates || []);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // YYYY-MM-DD 형식으로 변환 (timezone offset 방지)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (!excluded.has(dateStr)) {
          schedules.push({ date: dateStr });
        }
      }
      newPeriod.schedules = schedules;
    }

    if (initialUnit?.id) {
      try {
        const result = await unitApi.createTrainingPeriod(initialUnit.id, {
          name,
          workStartTime: newPeriod.workStartTime,
          workEndTime: newPeriod.workEndTime,
          lunchStartTime: newPeriod.lunchStartTime,
          lunchEndTime: newPeriod.lunchEndTime,
          officerName: newPeriod.officerName || null,
          officerPhone: newPeriod.officerPhone || null,
          officerEmail: newPeriod.officerEmail || null,
          hasCateredMeals: newPeriod.hasCateredMeals,
          hasHallLodging: newPeriod.hasHallLodging,
          allowsPhoneBeforeAfter: newPeriod.allowsPhoneBeforeAfter,
          startDate,
          endDate,
          excludedDates,
        });

        const created = result?.data;
        if (created) {
          const mapped = mapPeriodToForm(created);
          setTrainingPeriods((prev) => {
            const next = [...prev, mapped];
            setActiveTab(next.length - 1);
            return next;
          });
          return;
        }
      } catch (err) {
        console.error(err);
        showError('교육기간 생성에 실패했습니다.');
      }
    }

    setTrainingPeriods((prev) => {
      const next = [...prev, newPeriod];
      setActiveTab(next.length - 1);
      return next;
    });
  };

  const handleRemovePeriod = (index: number) => {
    const period = trainingPeriods[index];
    if (period.id) {
      const ok = confirm(
        `"${period.name}" 교육기간을 삭제하시겠습니까? 관련된 일정과 장소도 모두 삭제됩니다.`,
      );
      if (!ok) return;
    }
    setTrainingPeriods((prev) => prev.filter((_, i) => i !== index));
    setActiveTab('basic');
  };

  const handlePeriodClick = (index: number) => {
    setActiveTab(index);
  };

  const handlePeriodChange = (field: keyof TrainingPeriodFormData, value: unknown) => {
    if (typeof activeTab !== 'number') return;
    setTrainingPeriods((prev) =>
      prev.map((p, i) => (i === activeTab ? { ...p, [field]: value } : p)),
    );
  };

  const handleLocationUpdate = (
    locIndex: number,
    field: keyof LocationData,
    value: LocationData[keyof LocationData],
  ) => {
    if (typeof activeTab !== 'number') return;
    setTrainingPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== activeTab) return p;
        const newLocations = [...p.locations];
        newLocations[locIndex] = { ...newLocations[locIndex], [field]: value };
        return { ...p, locations: newLocations };
      }),
    );
  };

  const handleLocationAdd = () => {
    if (typeof activeTab !== 'number') return;
    setTrainingPeriods((prev) =>
      prev.map((p, i) =>
        i === activeTab ? { ...p, locations: [...p.locations, createEmptyLocation()] } : p,
      ),
    );
  };

  const handleLocationRemove = (locIndex: number) => {
    if (typeof activeTab !== 'number') return;
    setTrainingPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== activeTab) return p;
        const removed = p.locations[locIndex];
        const nextLocations = p.locations.filter((_, li) => li !== locIndex);
        if (!removed?.id) {
          return { ...p, locations: nextLocations };
        }
        const nextScheduleMap: Record<number | string, ScheduleLocationFormData[]> = {};
        Object.entries(p.scheduleLocationMap).forEach(([key, value]) => {
          nextScheduleMap[key] = value.filter((l) => l.trainingLocationId !== removed.id);
        });
        return { ...p, locations: nextLocations, scheduleLocationMap: nextScheduleMap };
      }),
    );
  };

  const handleScheduleLocationRowAdd = (scheduleIndex: number) => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    const scheduleKey = period.schedules[scheduleIndex]?.id ?? `new-${scheduleIndex}`;

    setTrainingPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== activeTab) return p;
        const current = p.scheduleLocationMap[scheduleKey] || [];
        const next = [
          ...current,
          { trainingLocationId: '', plannedCount: null, actualCount: null },
        ];
        return { ...p, scheduleLocationMap: { ...p.scheduleLocationMap, [scheduleKey]: next } };
      }),
    );
  };

  const handleScheduleLocationRowRemove = (scheduleIndex: number, rowIndex: number) => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    const scheduleKey = period.schedules[scheduleIndex]?.id ?? `new-${scheduleIndex}`;

    setTrainingPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== activeTab) return p;
        const current = p.scheduleLocationMap[scheduleKey] || [];
        const next = current.filter((_, idx) => idx !== rowIndex);
        return { ...p, scheduleLocationMap: { ...p.scheduleLocationMap, [scheduleKey]: next } };
      }),
    );
  };

  const handleScheduleLocationRowChange = (
    scheduleIndex: number,
    rowIndex: number,
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount',
    value: number | string | null,
  ) => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    const scheduleKey = period.schedules[scheduleIndex]?.id ?? `new-${scheduleIndex}`;

    setTrainingPeriods((prev) =>
      prev.map((p, i) => {
        if (i !== activeTab) return p;
        const current = p.scheduleLocationMap[scheduleKey] || [];
        const next = current.map((row, idx) =>
          idx === rowIndex ? { ...row, [field]: value } : row,
        );
        return { ...p, scheduleLocationMap: { ...p.scheduleLocationMap, [scheduleKey]: next } };
      }),
    );
  };

  const handleScheduleLocationsSave = async () => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    if (!period.id) {
      showWarning('교육기간을 먼저 저장해주세요.');
      return;
    }

    const scheduleLocationsPayload: Array<{
      unitScheduleId: number;
      trainingLocationId: number;
      plannedCount?: number | null;
      actualCount?: number | null;
    }> = [];

    for (const schedule of period.schedules) {
      if (!schedule.id) continue;
      const scheduleKey = schedule.id;
      const entries = period.scheduleLocationMap[scheduleKey] || [];
      for (const entry of entries) {
        const locId = Number(entry.trainingLocationId);
        if (!entry.trainingLocationId || Number.isNaN(locId)) {
          showWarning('장소를 선택해야 저장할 수 있습니다.');
          return;
        }
        scheduleLocationsPayload.push({
          unitScheduleId: schedule.id,
          trainingLocationId: locId,
          plannedCount: entry.plannedCount ?? null,
          actualCount: entry.actualCount ?? null,
        });
      }
    }

    try {
      await unitApi.updateTrainingPeriodScheduleLocations(period.id, {
        scheduleLocations: scheduleLocationsPayload,
      });
      showSuccess('장소 매칭이 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    } catch (err) {
      console.error(err);
      showError('장소 매칭 저장에 실패했습니다.');
    }
  };

  const handleSaveAddress = async () => {
    if (!initialUnit?.id) return;

    try {
      await unitApi.updateUnitAddress(initialUnit.id, basicForm.addressDetail);
      showSuccess('주소가 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    } catch (err) {
      console.error(err);
      showError('주소 저장에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 기본 검증
    if (!basicForm.name.trim()) {
      showWarning('부대명을 입력해주세요.');
      setActiveTab('basic');
      return;
    }

    if (trainingPeriods.length === 0) {
      showWarning('최소 1개의 교육기간을 추가해주세요.');
      setActiveTab('basic');
      return;
    }

    try {
      if (initialUnit) {
        // ===== 수정 모드: 새 API 형식 사용 =====
        const updatePayload: UpdateUnitWithPeriodsPayload = {
          // Unit 기본정보 (주소는 별도 API로 저장하므로 제외)
          name: basicForm.name,
          unitType: basicForm.unitType,
          wideArea: basicForm.wideArea,
          region: basicForm.region,

          // TrainingPeriods 배열
          trainingPeriods: trainingPeriods.map((p) => ({
            id: p.id, // 기존 period면 id 있음, 신규면 undefined
            name: p.name,
            workStartTime: p.workStartTime || null,
            workEndTime: p.workEndTime || null,
            lunchStartTime: p.lunchStartTime || null,
            lunchEndTime: p.lunchEndTime || null,
            officerName: p.officerName || null,
            officerPhone: p.officerPhone || null,
            officerEmail: p.officerEmail || null,
            hasCateredMeals: p.hasCateredMeals,
            hasHallLodging: p.hasHallLodging,
            allowsPhoneBeforeAfter: p.allowsPhoneBeforeAfter,
            // Locations
            locations: p.locations.map((loc) => ({
              id: loc.id, // 기존 location면 id 있음
              originalPlace: loc.originalPlace,
              changedPlace: loc.changedPlace || null,
              hasInstructorLounge: loc.hasInstructorLounge,
              hasWomenRestroom: loc.hasWomenRestroom,
              note: loc.note || null,
            })),
            // Schedules (신규 period일 때만 - 기존 period는 별도 API로 수정)
            schedules: p.id ? undefined : p.schedules.map((s) => ({ date: s.date })),
          })),
        };

        // PUT API 직접 호출
        await unitApi.updateUnit(initialUnit.id, updatePayload);
        showSuccess('부대 정보가 수정되었습니다.');
      } else {
        // ===== 신규 등록 모드: 기존 형식 사용 (registerSingleUnit) =====
        const firstPeriod = trainingPeriods[0];
        const sortedSchedules = [...firstPeriod.schedules].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        const educationStart = sortedSchedules[0]?.date?.split('T')[0] || null;
        const educationEnd =
          sortedSchedules[sortedSchedules.length - 1]?.date?.split('T')[0] || null;

        // excludedDates 계산
        const scheduleDates = new Set(sortedSchedules.map((s) => s.date?.split('T')[0] || s.date));
        const excludedDates: string[] = [];
        if (educationStart && educationEnd) {
          const start = new Date(educationStart + 'T00:00:00');
          const end = new Date(educationEnd + 'T00:00:00');
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            if (!scheduleDates.has(dateStr)) {
              excludedDates.push(dateStr);
            }
          }
        }

        const registerPayload = {
          ...basicForm,
          educationStart,
          educationEnd,
          excludedDates,
          workStartTime: firstPeriod.workStartTime || null,
          workEndTime: firstPeriod.workEndTime || null,
          lunchStartTime: firstPeriod.lunchStartTime || null,
          lunchEndTime: firstPeriod.lunchEndTime || null,
          hasCateredMeals: firstPeriod.hasCateredMeals,
          hasHallLodging: firstPeriod.hasHallLodging,
          allowsPhoneBeforeAfter: firstPeriod.allowsPhoneBeforeAfter,
          trainingLocations: firstPeriod.locations.map((loc) => ({
            originalPlace: loc.originalPlace,
            changedPlace: loc.changedPlace,
            hasInstructorLounge: loc.hasInstructorLounge,
            hasWomenRestroom: loc.hasWomenRestroom,
            note: loc.note,
          })),
          officerName: firstPeriod.officerName,
          officerPhone: firstPeriod.officerPhone,
          officerEmail: firstPeriod.officerEmail,
        };

        await onRegister?.(registerPayload as unknown as UnitData);
        showSuccess('부대가 등록되었습니다.');
      }

      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
      onClose();
    } catch {
      showError('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = () => {
    if (!initialUnit) return;
    const ok = confirm('이 부대를 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.');
    if (ok) {
      onDelete?.(initialUnit.id);
    }
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
          <form id="unit-form" onSubmit={handleSubmit}>
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
                onPeriodNameEdit={(index, name) => {
                  setTrainingPeriods((prev) =>
                    prev.map((p, i) => (i === index ? { ...p, name } : p)),
                  );
                }}
                onScheduleSave={async (index, startDate, endDate, excludedDates) => {
                  const period = trainingPeriods[index];

                  console.log('[onScheduleSave] period:', {
                    id: period.id,
                    name: period.name,
                    startDate,
                    endDate,
                    excludedDates,
                  });

                  // 수정 모드일 때만 API 호출 (신규 등록은 전체 저장 시 처리)
                  if (period.id) {
                    // 배정된 강사가 있는 경우 확인 메시지 표시 (부대 조회 시 계산된 값 사용)
                    if (period.hasAssignments) {
                      const confirmMsg = `이 교육기간에 이미 배정된 강사가 있습니다.\n\n일정을 변경하면 삭제되는 날짜에 배정된 강사에게 우선배정 크레딧이 부여됩니다.\n\n계속하시겠습니까?`;
                      if (!window.confirm(confirmMsg)) {
                        return;
                      }
                    }

                    // API 호출
                    try {
                      console.log('[onScheduleSave] Calling API with periodId:', period.id);
                      const result = await unitApi.updateTrainingPeriodSchedule(period.id, {
                        startDate,
                        endDate,
                        excludedDates,
                      });
                      console.log('[onScheduleSave] API result:', result);

                      if (result.data) {
                        showSuccess(
                          `일정 수정 완료: ${result.data.deleted}개 삭제, ${result.data.added}개 추가` +
                            (result.data.creditsGiven > 0
                              ? `, ${result.data.creditsGiven}명에게 크레딧 부여`
                              : ''),
                        );

                        // 데이터 갱신
                        queryClient.invalidateQueries({ queryKey: ['unit', initialUnit?.id] });
                        queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
                      } else {
                        // 성공적이지만 data 없는 경우도 처리
                        showSuccess('일정이 수정되었습니다.');
                        queryClient.invalidateQueries({ queryKey: ['unit', initialUnit?.id] });
                        queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
                      }
                    } catch (err) {
                      console.error('[onScheduleSave] API error:', err);
                      showError('일정 수정 중 오류가 발생했습니다.');
                      return;
                    }
                  } else {
                    console.log(
                      '[onScheduleSave] No period.id - skipping API call (will save on form submit)',
                    );
                  }

                  // 로컬 상태 업데이트 (신규 등록 또는 수정 후)
                  const start = new Date(startDate + 'T00:00:00');
                  const end = new Date(endDate + 'T00:00:00');
                  const schedules: { date: string }[] = [];
                  const excluded = new Set(excludedDates);

                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    if (!excluded.has(dateStr)) {
                      schedules.push({ date: dateStr });
                    }
                  }

                  setTrainingPeriods((prev) =>
                    prev.map((p, i) => (i === index ? { ...p, schedules } : p)),
                  );
                }}
                isEditMode={Boolean(initialUnit)}
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
