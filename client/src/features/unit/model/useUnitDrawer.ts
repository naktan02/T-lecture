// client/src/features/unit/model/useUnitDrawer.ts
// UnitDetailDrawerV2의 상태 및 비즈니스 로직 관리 훅

import { useEffect, useMemo, useState, useCallback, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { showError, showSuccess, showWarning, showConfirm } from '../../../shared/utils/toast';
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
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount' | 'requiredCount',
    value: number | string | null,
  ) => void;
  handleApplyFirstToAll: () => void;
  handleScheduleLocationsSave: () => Promise<void>;
  handleInfoSave: () => Promise<void>;
  handleLocationsSave: () => Promise<void>;
  handleBasicInfoSave: () => Promise<void>;
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
  handleCancelLocations: () => void;

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
  workEndTime: '17:00',
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
    // 서버에서 2000-01-01T09:00:00.000Z 형식으로 저장
    // UTC 시간을 그대로 파싱하여 HH:MM 추출 (로컬 변환 없음)
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // UTC 시간 그대로 사용
    const hours = d.getUTCHours().toString().padStart(2, '0');
    const minutes = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
    const locations = (s.scheduleLocations || []).map((sl) => ({
      trainingLocationId: sl.trainingLocationId,
      plannedCount: sl.plannedCount ?? null,
      actualCount: sl.actualCount ?? null,
      requiredCount: sl.requiredCount ?? null,
    }));
    // 기존 장소 매칭이 없으면 빈 row 1개 추가 (기본 제공)
    scheduleLocationMap[key] =
      locations.length > 0
        ? locations
        : [{ trainingLocationId: '', plannedCount: null, actualCount: null, requiredCount: null }];
  });

  const hasAssignments = (period.schedules || []).some(
    (s) => s.assignments && s.assignments.length > 0,
  );

  // 각 장소별로 배정이 있는지 확인 (assignments의 trainingLocationId와 매칭)
  const locationAssignmentsMap = new Map<number, boolean>();
  for (const schedule of period.schedules || []) {
    for (const assignment of schedule.assignments || []) {
      // @ts-expect-error - trainingLocationId는 서버에서 추가됨
      if (assignment.trainingLocationId) {
        // @ts-expect-error - trainingLocationId는 서버에서 추가됨
        locationAssignmentsMap.set(assignment.trainingLocationId, true);
      }
    }
  }

  const locationsWithAssignments = (period.locations || []).map((loc) => ({
    ...mapLocationToForm(loc),
    hasAssignments: loc.id ? locationAssignmentsMap.has(loc.id) : false,
  }));

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
    locations: locationsWithAssignments,
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
    validationStatus: 'Valid',
    validationMessage: '',
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
      // 저장 후 캐시 무효화 - drawer 재진입 시 최신 데이터 표시
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: (payload: CreateTrainingPeriodPayload) =>
      unitApi.createTrainingPeriod(unitId!, payload),
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (trainingPeriodId: number) => unitApi.deleteTrainingPeriod(trainingPeriodId),
  });

  const updateScheduleLocationsMutation = useMutation({
    mutationFn: ({
      periodId,
      data,
    }: {
      periodId: number;
      data: {
        locations?: Array<{
          id?: number;
          originalPlace: string;
          changedPlace?: string | null;
          hasInstructorLounge?: boolean;
          hasWomenRestroom?: boolean;
          note?: string | null;
        }>;
        scheduleLocations: Array<{
          unitScheduleId: number;
          trainingLocationId?: number;
          locationName?: string;
          plannedCount?: number | null;
          actualCount?: number | null;
          requiredCount?: number | null;
        }>;
      };
    }) => unitApi.updateTrainingPeriodScheduleLocations(periodId, data),
    onSuccess: () => {
      // 저장 후 캐시 무효화 - drawer 재진입 시 최신 데이터 표시
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: (address: string) => unitApi.updateUnitAddress(unitId!, address),
    onSuccess: () => {
      // 저장 후 캐시 무효화 - drawer 재진입 시 최신 데이터 표시
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
      // 저장 후 캐시 무효화 - drawer 재진입 시 최신 데이터 표시
      queryClient.invalidateQueries({ queryKey: ['unitDetail', unitId] });
    },
  });

  const updateTrainingPeriodInfoMutation = useMutation({
    mutationFn: ({
      periodId,
      data,
    }: {
      periodId: number;
      data: {
        name?: string;
        workStartTime?: string | null;
        workEndTime?: string | null;
        lunchStartTime?: string | null;
        lunchEndTime?: string | null;
        officerName?: string | null;
        officerPhone?: string | null;
        officerEmail?: string | null;
        hasCateredMeals?: boolean;
        hasHallLodging?: boolean;
        allowsPhoneBeforeAfter?: boolean;
      };
    }) => unitApi.updateTrainingPeriodInfo(periodId, data),
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
    async (index: number) => {
      const period = trainingPeriods[index];

      // 삭제 전 확인
      if (period.hasAssignments) {
        const confirmed = await showConfirm(
          `"${period.name}" 교육기간에 배정된 강사가 있습니다.\n\n삭제하면 모든 배정이 취소됩니다.\n\n계속하시겠습니까?`,
        );
        if (!confirmed) return;
      } else {
        const confirmed = await showConfirm(`"${period.name}" 교육기간을 삭제하시겠습니까?`);
        if (!confirmed) return;
      }

      // 서버에 저장된 교육기간이면 삭제 API 호출
      if (period.id) {
        try {
          await deletePeriodMutation.mutateAsync(period.id);
          showSuccess(`"${period.name}" 교육기간이 삭제되었습니다.`);
        } catch {
          showError('교육기간 삭제에 실패했습니다.');
          return;
        }
      }

      // 로컬 상태에서 제거
      setTrainingPeriods((prev) => prev.filter((_, i) => i !== index));
      setActiveTab('basic');
    },
    [trainingPeriods, deletePeriodMutation],
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
            { trainingLocationId: '', plannedCount: null, actualCount: null, requiredCount: null },
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
      field: 'trainingLocationId' | 'plannedCount' | 'actualCount' | 'requiredCount',
      value: number | string | null,
    ) => {
      if (typeof activeTab !== 'number') return;
      const period = trainingPeriods[activeTab];
      const scheduleKey = period.schedules[scheduleIndex]?.id ?? `new-${scheduleIndex}`;

      setTrainingPeriods((prev) =>
        prev.map((p, i) => {
          if (i !== activeTab) return p;
          const current = p.scheduleLocationMap[scheduleKey] || [];

          // row가 존재하지 않으면 새로 생성
          let next: typeof current;
          if (rowIndex >= current.length) {
            // 빈 row 추가 후 값 설정
            const newRow = {
              trainingLocationId: '',
              plannedCount: null,
              actualCount: null,
              requiredCount: null,
              [field]: value,
            };
            next = [...current, newRow];
          } else {
            next = current.map((row, idx) => (idx === rowIndex ? { ...row, [field]: value } : row));
          }
          return { ...p, scheduleLocationMap: { ...p.scheduleLocationMap, [scheduleKey]: next } };
        }),
      );
    },
    [activeTab, trainingPeriods],
  );

  // 첫 번째 일정의 장소 매칭 데이터를 모든 일정에 복사
  const handleApplyFirstToAll = useCallback(() => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    if (period.schedules.length < 2) return;

    const firstScheduleKey = period.schedules[0]?.id ?? 'new-0';
    const firstData = period.scheduleLocationMap[firstScheduleKey] || [];
    if (firstData.length === 0) {
      showWarning('첫 번째 날짜에 장소 데이터가 없습니다.');
      return;
    }

    // 첫 번째 데이터를 깊은 복사하여 모든 스케줄에 적용
    const newMap: Record<number | string, ScheduleLocationFormData[]> = {};
    for (let i = 0; i < period.schedules.length; i++) {
      const scheduleKey = period.schedules[i]?.id ?? `new-${i}`;
      newMap[scheduleKey] = firstData.map((row) => ({ ...row }));
    }

    setTrainingPeriods((prev) =>
      prev.map((p, i) => (i === activeTab ? { ...p, scheduleLocationMap: newMap } : p)),
    );
    showSuccess('첫 번째 날짜 데이터가 전체 적용되었습니다.');
  }, [activeTab, trainingPeriods]);

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
      requiredCount?: number | null;
    }> = [];

    for (let i = 0; i < period.schedules.length; i++) {
      const schedule = period.schedules[i];
      if (!schedule.id) continue;
      // TrainingPeriodTab과 동일한 키 계산 방식
      const scheduleKey = schedule.id ?? `new-${i}`;
      const entries = period.scheduleLocationMap[scheduleKey] || [];
      for (const entry of entries) {
        const locId = Number(entry.trainingLocationId);
        // 빈 장소 선택은 건너뛰기 (아직 선택 안 한 경우)
        if (!entry.trainingLocationId || entry.trainingLocationId === '' || Number.isNaN(locId)) {
          continue;
        }
        scheduleLocationsPayload.push({
          unitScheduleId: schedule.id,
          trainingLocationId: locId,
          plannedCount: entry.plannedCount ?? null,
          actualCount: entry.actualCount ?? null,
          requiredCount: entry.requiredCount ?? null,
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

  // 정보 섹션 저장 (근무시간, 담당관, 시설정보만 전송)
  const handleInfoSave = useCallback(async () => {
    if (typeof activeTab !== 'number') return;
    const period = trainingPeriods[activeTab];
    if (!period.id) {
      showWarning('교육기간을 먼저 저장해주세요.');
      return;
    }

    try {
      await updateTrainingPeriodInfoMutation.mutateAsync({
        periodId: period.id,
        data: {
          name: period.name,
          workStartTime: period.workStartTime || null,
          workEndTime: period.workEndTime || null,
          lunchStartTime: period.lunchStartTime || null,
          lunchEndTime: period.lunchEndTime || null,
          officerName: period.officerName || null,
          officerPhone: period.officerPhone || null,
          officerEmail: period.officerEmail || null,
          hasCateredMeals: period.hasCateredMeals,
          hasHallLodging: period.hasHallLodging,
          allowsPhoneBeforeAfter: period.allowsPhoneBeforeAfter,
        },
      });
      showSuccess('기본 정보가 저장되었습니다.');
    } catch {
      showError('기본 정보 저장에 실패했습니다.');
    }
  }, [activeTab, trainingPeriods, updateTrainingPeriodInfoMutation]);

  // 장소 섹션 저장 (장소 + 일정별 장소 매칭 동시 처리)
  const handleLocationsSave = useCallback(async () => {
    if (typeof activeTab !== 'number' || !unitId) return;
    const period = trainingPeriods[activeTab];
    if (!period.id) {
      showWarning('교육기간을 먼저 저장해주세요.');
      return;
    }

    try {
      // 장소 목록 + 일정별 매칭을 한 번에 전송
      // 서버에서 장소를 먼저 생성한 후 이름으로 id를 매핑

      // 1. 장소 목록 준비
      const locationsPayload = period.locations.map((loc) => ({
        id: loc.id,
        originalPlace: loc.originalPlace,
        changedPlace: loc.changedPlace || null,
        hasInstructorLounge: loc.hasInstructorLounge,
        hasWomenRestroom: loc.hasWomenRestroom,
        note: loc.note || null,
      }));

      // 2. 일정별 장소 매칭 준비 (id 대신 locationName 사용 가능)
      const scheduleLocationsPayload: Array<{
        unitScheduleId: number;
        trainingLocationId?: number;
        locationName?: string;
        plannedCount?: number | null;
        actualCount?: number | null;
        requiredCount?: number | null;
      }> = [];

      // id -> 장소 이름 맵 생성
      const locIdToName = new Map<number | string, string>();
      // 유효한 장소 id 목록 (실제 DB에 존재하는 id)
      const validLocationIds = new Set<number>();

      for (const loc of period.locations) {
        if (loc.id) {
          locIdToName.set(loc.id, loc.originalPlace);
          validLocationIds.add(loc.id);
        }
        // 새 장소 (id 없음)도 originalPlace로 매핑용 임시 키 생성
        locIdToName.set(loc.originalPlace, loc.originalPlace);
      }

      for (let i = 0; i < period.schedules.length; i++) {
        const schedule = period.schedules[i];
        if (!schedule.id) continue;
        const scheduleKey = schedule.id ?? `new-${i}`;
        const entries = period.scheduleLocationMap[scheduleKey] || [];
        for (const entry of entries) {
          if (!entry.trainingLocationId || entry.trainingLocationId === '') {
            continue;
          }

          const locId = Number(entry.trainingLocationId);
          // 유효한 장소 id인 경우에만 trainingLocationId 사용
          const isValidId = !Number.isNaN(locId) && validLocationIds.has(locId);
          const locationName =
            locIdToName.get(locId) || locIdToName.get(String(entry.trainingLocationId));

          scheduleLocationsPayload.push({
            unitScheduleId: schedule.id,
            trainingLocationId: isValidId ? locId : undefined,
            locationName: locationName || String(entry.trainingLocationId), // 항상 이름 전송
            plannedCount: entry.plannedCount ?? null,
            actualCount: entry.actualCount ?? null,
            requiredCount: entry.requiredCount ?? null,
          });
        }
      }

      // 3. 한 번의 API 호출로 전송
      await updateScheduleLocationsMutation.mutateAsync({
        periodId: period.id,
        data: {
          locations: locationsPayload,
          scheduleLocations: scheduleLocationsPayload,
        },
      });

      showSuccess('장소 정보가 저장되었습니다.');
    } catch {
      showError('장소 저장에 실패했습니다.');
    }
  }, [activeTab, unitId, trainingPeriods, updateScheduleLocationsMutation]);

  // 기본 정보 저장 (부대명, 군구분, 주소)
  const handleBasicInfoSave = useCallback(async () => {
    if (!unitId) return;

    try {
      await updateMutation.mutateAsync({
        name: basicForm.name,
        unitType: basicForm.unitType,
        wideArea: basicForm.wideArea,
        region: basicForm.region,
        detailAddress: basicForm.detailAddress,
        trainingPeriods: [], // 기본정보만 업데이트, 교육기간은 변경하지 않음
      });
      showSuccess('기본 정보가 저장되었습니다.');
    } catch {
      showError('기본 정보 저장에 실패했습니다.');
    }
  }, [unitId, basicForm, updateMutation]);

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
        // 신규 등록 시에만 drawer 닫기, 수정 모드에서는 화면 유지
        if (!unitId) {
          onClose();
        }
      } catch {
        showError('저장 중 오류가 발생했습니다.');
      }
    },
    [unitId, basicForm, trainingPeriods, updateMutation, onRegister, queryClient, onClose],
  );

  const handleDelete = useCallback(async () => {
    if (!unitId) return;
    const ok = await showConfirm('이 부대를 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.');
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
          const confirmed = await showConfirm(confirmMsg);
          if (!confirmed) {
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

  // 장소 편집 취소 - 서버 데이터로 복원
  const handleCancelLocations = useCallback(() => {
    // 서버에서 받은 원본 데이터로 복원
    if (!detailData?.data) return;

    const unitData = detailData.data;
    const periods = (unitData.trainingPeriods || []).map(mapPeriodToForm);
    setTrainingPeriods(periods);
  }, [detailData]);

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
    handleApplyFirstToAll,
    handleScheduleLocationsSave,
    handleInfoSave,
    handleLocationsSave,
    handleBasicInfoSave,
    handleSaveAddress,
    handleSubmit,
    handleDelete,
    handleScheduleSave,
    handlePeriodNameEdit,
    handleCancelLocations,

    // Status
    isEditMode: Boolean(unitId),
  };
};
