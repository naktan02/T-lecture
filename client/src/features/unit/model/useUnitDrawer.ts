// client/src/features/unit/model/useUnitDrawer.ts
// UnitDetailDrawerV2의 상태 및 비즈니스 로직 관리 훅

import { useEffect, useMemo, useState, useCallback, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { showError, showSuccess, showWarning } from '../../../shared/utils/toast';
import { generateDateRange } from '../../../shared/utils/dateFormat';
import {
  Unit,
  TrainingPeriod,
  TrainingLocation,
  toDateInputValue,
  UpdateUnitWithPeriodsPayload,
  CreateTrainingPeriodPayload,
} from '../../../shared/types/unit.types';
import { UnitBasicFormData, TrainingPeriodSummary, MilitaryType } from '../ui/UnitBasicInfoTab';
import { TrainingPeriodFormData, ScheduleLocationFormData } from '../ui/TrainingPeriodTab';
import { LocationData } from '../ui/LocationAccordion';

// ========== Types ==========

interface ApiEnvelope<T> {
  result?: string;
  data: T;
}

interface UseUnitDrawerProps {
  unitId?: number;
  isOpen: boolean;
  onRegister?: (data: UnitData) => Promise<unknown> | void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

interface UseUnitDrawerReturn {
  // State
  activeTab: 'basic' | number;
  setActiveTab: (tab: 'basic' | number) => void;
  basicForm: UnitBasicFormData;
  trainingPeriods: TrainingPeriodFormData[];
  setTrainingPeriods: React.Dispatch<React.SetStateAction<TrainingPeriodFormData[]>>;

  // Computed
  periodSummaries: TrainingPeriodSummary[];

  // Handlers
  handleBasicFormChange: (field: keyof UnitBasicFormData, value: string) => void;
  handleAddPeriod: (
    name: string,
    startDate?: string,
    endDate?: string,
    excludedDates?: string[],
  ) => Promise<void>;
  handleRemovePeriod: (index: number) => void;
  handlePeriodClick: (index: number) => void;
  handlePeriodChange: (field: keyof TrainingPeriodFormData, value: unknown) => void;
  handleLocationUpdate: (
    locIndex: number,
    field: keyof LocationData,
    value: LocationData[keyof LocationData],
  ) => void;
  handleLocationAdd: () => void;
  handleLocationRemove: (locIndex: number) => void;
  handleScheduleLocationRowAdd: (scheduleIndex: number) => void;
  handleScheduleLocationRowRemove: (scheduleIndex: number, rowIndex: number) => void;
  handleScheduleLocationRowChange: (
    scheduleIndex: number,
    rowIndex: number,
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount',
    value: number | string | null,
  ) => void;
  handleScheduleLocationsSave: () => Promise<void>;
  handleSaveAddress: () => Promise<void>;
  handleSubmit: (e: FormEvent) => Promise<void>;
  handleDelete: () => void;
  handleScheduleSave: (
    index: number,
    startDate: string,
    endDate: string,
    excludedDates: string[],
  ) => Promise<void>;
  handlePeriodNameEdit: (index: number, name: string) => void;

  // Status
  isEditMode: boolean;
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

const mapLocationToForm = (loc: TrainingLocation): LocationData => ({
  id: loc.id,
  originalPlace: loc.originalPlace || '',
  changedPlace: loc.changedPlace || '',
  hasInstructorLounge: loc.hasInstructorLounge || false,
  hasWomenRestroom: loc.hasWomenRestroom || false,
  note: loc.note || '',
});

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

// ========== Hook ==========

export const useUnitDrawer = ({
  unitId,
  isOpen,
  onRegister,
  onDelete,
  onClose,
}: UseUnitDrawerProps): UseUnitDrawerReturn => {
  const queryClient = useQueryClient();

  // ===== State =====
  const [activeTab, setActiveTab] = useState<'basic' | number>('basic');
  const [basicForm, setBasicForm] = useState<UnitBasicFormData>({
    name: '',
    unitType: 'Army',
    wideArea: '',
    region: '',
    addressDetail: '',
    detailAddress: '',
  });
  const [trainingPeriods, setTrainingPeriods] = useState<TrainingPeriodFormData[]>([]);

  // ===== Query =====
  const { data: detailData, isSuccess } = useQuery<ApiEnvelope<Unit>>({
    queryKey: ['unitDetail', unitId],
    queryFn: () => unitApi.getUnit(unitId as number),
    enabled: Boolean(unitId) && isOpen,
    staleTime: 0,
  });

  // ===== Mutations =====
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUnitWithPeriodsPayload) => unitApi.updateUnit(unitId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: (payload: CreateTrainingPeriodPayload) =>
      unitApi.createTrainingPeriod(unitId!, payload),
  });

  const updateScheduleLocationsMutation = useMutation({
    mutationFn: ({
      periodId,
      data,
    }: {
      periodId: number;
      data: {
        scheduleLocations: Array<{
          unitScheduleId: number;
          trainingLocationId: number;
          plannedCount?: number | null;
          actualCount?: number | null;
        }>;
      };
    }) => unitApi.updateTrainingPeriodScheduleLocations(periodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: (address: string) => unitApi.updateUnitAddress(unitId!, address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({
      periodId,
      data,
    }: {
      periodId: number;
      data: { startDate: string; endDate: string; excludedDates: string[] };
    }) => unitApi.updateTrainingPeriodSchedule(periodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  // ===== Data Binding =====
  useEffect(() => {
    if (!isOpen) return;

    if (!unitId) {
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
  }, [isOpen, unitId, detailData, isSuccess]);

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
  const handleBasicFormChange = useCallback((field: keyof UnitBasicFormData, value: string) => {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddPeriod = useCallback(
    async (name: string, startDate?: string, endDate?: string, excludedDates?: string[]) => {
      const newPeriod = createEmptyPeriod(name);

      // 시작일과 종료일이 있으면 일정 자동 생성
      if (startDate && endDate) {
        const dates = generateDateRange(startDate, endDate, excludedDates || []);
        newPeriod.schedules = dates.map((date) => ({ date }));
      }

      if (unitId) {
        try {
          const result = await createPeriodMutation.mutateAsync({
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
        } catch {
          showError('교육기간 생성에 실패했습니다.');
        }
      }

      setTrainingPeriods((prev) => {
        const next = [...prev, newPeriod];
        setActiveTab(next.length - 1);
        return next;
      });
    },
    [unitId, createPeriodMutation],
  );

  const handleRemovePeriod = useCallback(
    (index: number) => {
      const period = trainingPeriods[index];
      if (period.id) {
        const ok = confirm(
          `"${period.name}" 교육기간을 삭제하시겠습니까? 관련된 일정과 장소도 모두 삭제됩니다.`,
        );
        if (!ok) return;
      }
      setTrainingPeriods((prev) => prev.filter((_, i) => i !== index));
      setActiveTab('basic');
    },
    [trainingPeriods],
  );

  const handlePeriodClick = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  const handlePeriodChange = useCallback(
    (field: keyof TrainingPeriodFormData, value: unknown) => {
      if (typeof activeTab !== 'number') return;
      setTrainingPeriods((prev) =>
        prev.map((p, i) => (i === activeTab ? { ...p, [field]: value } : p)),
      );
    },
    [activeTab],
  );

  const handleLocationUpdate = useCallback(
    (locIndex: number, field: keyof LocationData, value: LocationData[keyof LocationData]) => {
      if (typeof activeTab !== 'number') return;
      setTrainingPeriods((prev) =>
        prev.map((p, i) => {
          if (i !== activeTab) return p;
          const newLocations = [...p.locations];
          newLocations[locIndex] = { ...newLocations[locIndex], [field]: value };
          return { ...p, locations: newLocations };
        }),
      );
    },
    [activeTab],
  );

  const handleLocationAdd = useCallback(() => {
    if (typeof activeTab !== 'number') return;
    setTrainingPeriods((prev) =>
      prev.map((p, i) =>
        i === activeTab ? { ...p, locations: [...p.locations, createEmptyLocation()] } : p,
      ),
    );
  }, [activeTab]);

  const handleLocationRemove = useCallback(
    (locIndex: number) => {
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
    },
    [activeTab],
  );

  const handleScheduleLocationRowAdd = useCallback(
    (scheduleIndex: number) => {
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
    },
    [activeTab, trainingPeriods],
  );

  const handleScheduleLocationRowRemove = useCallback(
    (scheduleIndex: number, rowIndex: number) => {
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
    },
    [activeTab, trainingPeriods],
  );

  const handleScheduleLocationRowChange = useCallback(
    (
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
    },
    [activeTab, trainingPeriods],
  );

  const handleScheduleLocationsSave = useCallback(async () => {
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
      await updateScheduleLocationsMutation.mutateAsync({
        periodId: period.id,
        data: { scheduleLocations: scheduleLocationsPayload },
      });
      showSuccess('장소 매칭이 저장되었습니다.');
    } catch {
      showError('장소 매칭 저장에 실패했습니다.');
    }
  }, [activeTab, trainingPeriods, updateScheduleLocationsMutation]);

  const handleSaveAddress = useCallback(async () => {
    if (!unitId) return;

    try {
      await updateAddressMutation.mutateAsync(basicForm.addressDetail);
      showSuccess('주소가 저장되었습니다.');
    } catch {
      showError('주소 저장에 실패했습니다.');
    }
  }, [unitId, basicForm.addressDetail, updateAddressMutation]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
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
        if (unitId) {
          // ===== 수정 모드 =====
          const updatePayload: UpdateUnitWithPeriodsPayload = {
            name: basicForm.name,
            unitType: basicForm.unitType,
            wideArea: basicForm.wideArea,
            region: basicForm.region,
            trainingPeriods: trainingPeriods
              .filter((p) => p.id)
              .map((p) => ({
                id: p.id,
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
                locations: p.locations.map((loc) => ({
                  id: loc.id,
                  originalPlace: loc.originalPlace,
                  changedPlace: loc.changedPlace || null,
                  hasInstructorLounge: loc.hasInstructorLounge,
                  hasWomenRestroom: loc.hasWomenRestroom,
                  note: loc.note || null,
                })),
              })),
          };

          await updateMutation.mutateAsync(updatePayload);
          showSuccess('부대 정보가 수정되었습니다.');
        } else {
          // ===== 신규 등록 모드 =====
          const firstPeriod = trainingPeriods[0];
          const sortedSchedules = [...firstPeriod.schedules].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
          const educationStart = sortedSchedules[0]?.date?.split('T')[0] || null;
          const educationEnd =
            sortedSchedules[sortedSchedules.length - 1]?.date?.split('T')[0] || null;

          const scheduleDates = new Set(
            sortedSchedules.map((s) => s.date?.split('T')[0] || s.date),
          );
          const excludedDates: string[] = [];
          if (educationStart && educationEnd) {
            const allDates = generateDateRange(educationStart, educationEnd);
            allDates.forEach((dateStr) => {
              if (!scheduleDates.has(dateStr)) {
                excludedDates.push(dateStr);
              }
            });
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
        onClose();
      } catch {
        showError('저장 중 오류가 발생했습니다.');
      }
    },
    [unitId, basicForm, trainingPeriods, updateMutation, onRegister, queryClient, onClose],
  );

  const handleDelete = useCallback(() => {
    if (!unitId) return;
    const ok = confirm('이 부대를 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.');
    if (ok) {
      onDelete?.(unitId);
    }
  }, [unitId, onDelete]);

  const handleScheduleSave = useCallback(
    async (index: number, startDate: string, endDate: string, excludedDates: string[]) => {
      const period = trainingPeriods[index];

      if (period.id) {
        // 배정된 강사가 있는 경우 확인
        if (period.hasAssignments) {
          const confirmMsg = `이 교육기간에 이미 배정된 강사가 있습니다.\n\n일정을 변경하면 삭제되는 날짜에 배정된 강사에게 우선배정 크레딧이 부여됩니다.\n\n계속하시겠습니까?`;
          if (!window.confirm(confirmMsg)) {
            return;
          }
        }

        try {
          const result = await updateScheduleMutation.mutateAsync({
            periodId: period.id,
            data: { startDate, endDate, excludedDates },
          });

          if (result.data) {
            showSuccess(
              `일정 수정 완료: ${result.data.deleted}개 삭제, ${result.data.added}개 추가` +
                (result.data.creditsGiven > 0
                  ? `, ${result.data.creditsGiven}명에게 크레딧 부여`
                  : ''),
            );
          } else {
            showSuccess('일정이 수정되었습니다.');
          }
        } catch {
          showError('일정 수정 중 오류가 발생했습니다.');
          return;
        }
      }

      // 로컬 상태 업데이트
      const dates = generateDateRange(startDate, endDate, excludedDates);
      const schedules = dates.map((date) => ({ date }));

      setTrainingPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, schedules } : p)));
    },
    [trainingPeriods, updateScheduleMutation],
  );

  const handlePeriodNameEdit = useCallback((index: number, name: string) => {
    setTrainingPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)));
  }, []);

  return {
    // State
    activeTab,
    setActiveTab,
    basicForm,
    trainingPeriods,
    setTrainingPeriods,

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
    isEditMode: Boolean(unitId),
  };
};
