// src/features/assignment/ui/AssignmentUnitEditModal.tsx
// 배정 페이지 전용 부대 편집 모달
// - 부대 기본정보: 읽기전용 헤더
// - 현재 선택된 교육기간만 표시 (다른 기간은 표시 안함)
// - 교육기간 일정 수정 가능 (시작일, 종료일, 불가일자)
// - 기본정보/장소정보 수정 가능
// - 이미 가져온 데이터 활용 (추가 API 호출 최소화)

import { useState } from 'react';
import { Button } from '../../../shared/ui';
import { showSuccess, showError, showConfirm } from '../../../shared/utils/toast';
import { isHoliday } from '../../../shared/utils/holidays';
import {
  TrainingPeriodTab,
  TrainingPeriodFormData,
  ScheduleLocationFormData,
} from '../../unit/ui/TrainingPeriodTab';
import { LocationData } from '../../unit/ui/LocationAccordion';
import { unitApi } from '../../unit/api/unitApi';
import { GroupedUnassignedUnit } from '../model/useAssignment';

interface Props {
  unit: GroupedUnassignedUnit;
  onClose: () => void;
  onSave?: (updatedSchedules?: { id: number; date: string }[]) => void;
  assignedDates?: Set<string>; // 이미 이 부대에 배정(임시/확정)이 있는 날짜들
}

// Time format helper
const formatTimeForInput = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  // 이미 "HH:mm" 형식인 경우 그대로 반환
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

export const AssignmentUnitEditModal: React.FC<Props> = ({
  unit,
  onClose,
  onSave: _onSave,
  assignedDates,
}) => {
  const { detail } = unit;

  // trainingPeriodId - GroupedUnassignedUnit에서 직접 가져옴
  const trainingPeriodId = unit.trainingPeriodId;

  // 일정 수정용 상태
  const [editStartDate, setEditStartDate] = useState(() => {
    const dates = unit.uniqueDates.sort();
    return dates[0] || '';
  });
  const [editEndDate, setEditEndDate] = useState(() => {
    const dates = unit.uniqueDates.sort();
    return dates[dates.length - 1] || '';
  });
  const [editExcludedDates, setEditExcludedDates] = useState<string[]>(() => {
    // 부대관리와 동일한 로직: 시작일~종료일 범위에서 실제 스케줄에 없는 날짜를 계산
    const dates = unit.uniqueDates.sort();
    if (dates.length === 0) return [];

    const start = dates[0];
    const end = dates[dates.length - 1];
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

    return excluded;
  });
  const [editExcludedDateInput, setEditExcludedDateInput] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // TrainingPeriodFormData로 변환 (현재 교육기간만)
  const [periodForm, setPeriodForm] = useState<TrainingPeriodFormData>(() => {
    // scheduleLocationMap 생성 - unit.locations에서 일정별/장소별 데이터 추출
    const scheduleLocationMap: Record<number | string, ScheduleLocationFormData[]> = {};

    // 각 스케줄의 장소 데이터를 올바르게 매핑
    for (const loc of unit.locations) {
      const locId = parseInt(loc.locationId.replace(/[^\d]/g, ''), 10);

      for (const sched of loc.schedules) {
        const schedId = parseInt(sched.scheduleId.replace(/[^\d]/g, ''), 10);

        if (!scheduleLocationMap[schedId]) {
          scheduleLocationMap[schedId] = [];
        }

        // 각 일정별로 해당 장소의 plannedCount/actualCount/requiredCount 저장
        scheduleLocationMap[schedId].push({
          trainingLocationId: locId,
          plannedCount: sched.plannedCount ?? null,
          actualCount: sched.actualCount ?? null,
          requiredCount: sched.requiredCount ?? null,
        });
      }
    }

    // 빈 scheduleLocationMap에 대해 기본 row 추가
    const allScheduleIds = new Set<number>();
    for (const loc of unit.locations) {
      for (const sched of loc.schedules) {
        const schedId = parseInt(sched.scheduleId.replace(/[^\d]/g, ''), 10);
        allScheduleIds.add(schedId);
      }
    }
    for (const schedId of allScheduleIds) {
      if (!scheduleLocationMap[schedId] || scheduleLocationMap[schedId].length === 0) {
        scheduleLocationMap[schedId] = [
          { trainingLocationId: '', plannedCount: null, actualCount: null, requiredCount: null },
        ];
      }
    }

    return {
      id: trainingPeriodId,
      name: unit.trainingPeriodName || '',
      workStartTime: formatTimeForInput(detail.workStartTime),
      workEndTime: formatTimeForInput(detail.workEndTime),
      lunchStartTime: formatTimeForInput(detail.lunchStartTime),
      lunchEndTime: formatTimeForInput(detail.lunchEndTime),
      officerName: detail.officerName || '',
      officerPhone: detail.officerPhone || '',
      officerEmail: detail.officerEmail || '',
      hasCateredMeals: detail.hasCateredMeals || false,
      hasHallLodging: detail.hasHallLodging || false,
      allowsPhoneBeforeAfter: detail.allowsPhoneBeforeAfter || false,
      locations: unit.locations.map((loc) => ({
        id: parseInt(loc.locationId.replace(/[^\d]/g, ''), 10),
        originalPlace: loc.locationName,
        changedPlace: undefined,
        hasInstructorLounge: detail.hasInstructorLounge || false,
        hasWomenRestroom: detail.hasWomenRestroom || false,
        note: detail.note || '',
      })),
      schedules: unit.uniqueDates.map((date) => {
        // 해당 날짜의 scheduleId 찾기
        for (const loc of unit.locations) {
          const sched = loc.schedules.find((s) => s.date === date);
          if (sched) {
            const schedId = parseInt(sched.scheduleId.replace(/[^\d]/g, ''), 10);
            return { id: schedId, date };
          }
        }
        return { id: undefined, date };
      }),
      scheduleLocationMap,
    };
  });

  // === 일정 수정 관련 핸들러 ===

  const handleAddExcludedDate = () => {
    if (editExcludedDateInput && !editExcludedDates.includes(editExcludedDateInput)) {
      setEditExcludedDates((prev) => [...prev, editExcludedDateInput].sort());
      setEditExcludedDateInput('');
    }
  };

  const handleRemoveExcludedDate = (date: string) => {
    setEditExcludedDates((prev) => prev.filter((d) => d !== date));
  };

  const handleScheduleSave = async () => {
    if (!trainingPeriodId) {
      showError('교육기간 ID가 없습니다. 페이지를 새로고침해주세요.');
      return;
    }
    if (!editStartDate || !editEndDate) {
      showError('시작일과 종료일을 입력하세요');
      return;
    }

    // 현재 일정과 새 일정을 비교하여 삭제되는 날짜 중 배정이 있는지 확인
    const currentDates = new Set(unit.uniqueDates);
    const calculateWeekdayDates = (start: string, end: string, excludes: string[]): string[] => {
      const dates: string[] = [];
      const excludeSet = new Set(excludes);
      const current = new Date(start);
      const endDate = new Date(end);

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay(); // 0=일, 6=토
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // 주말, 공휴일, 제외일 필터링
        if (!isWeekend && !isHoliday(current) && !excludeSet.has(dateStr)) {
          dates.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const newDatesSet = new Set(
      calculateWeekdayDates(editStartDate, editEndDate, editExcludedDates),
    );

    // 삭제될 날짜들 중 배정이 있는 날짜 확인
    const deletedDatesWithAssignments: string[] = [];
    if (assignedDates) {
      for (const date of currentDates) {
        if (!newDatesSet.has(date) && assignedDates.has(date)) {
          deletedDatesWithAssignments.push(date);
        }
      }
    }

    // 배정된 날짜가 삭제되는 경우 확인
    if (deletedDatesWithAssignments.length > 0) {
      const dateList = deletedDatesWithAssignments.sort().join(', ');
      const confirmed = await showConfirm(
        `다음 날짜에 이미 배정된 강사가 있습니다:\n${dateList}\n\n일정을 변경하면 삭제되는 날짜에 배정된 강사에게 우선배정 크레딧이 부여됩니다.\n\n계속하시겠습니까?`,
      );
      if (!confirmed) {
        return;
      }
    }

    const newDates = [...newDatesSet].sort();

    // 즉시 UI 업데이트 - 기존 날짜 매핑 유지
    // 1. 기존 일정의 날짜 -> schedule ID 매핑 생성
    const existingDateToScheduleId = new Map<string, number>();
    for (const sched of periodForm.schedules) {
      if (sched.date && sched.id !== undefined) {
        existingDateToScheduleId.set(sched.date, sched.id);
      }
    }

    // 2. 새 일정 생성 (기존 ID 유지 또는 undefined)
    const tempSchedules = newDates.map((date) => {
      const existingId = existingDateToScheduleId.get(date);
      return {
        id: existingId, // undefined if new date
        date,
      };
    });

    // 3. 기존 매핑 데이터 중 새 날짜에 해당하는 것만 유지
    const newDateSet = new Set(newDates);
    const preservedScheduleLocationMap: Record<
      number | string,
      (typeof periodForm.scheduleLocationMap)[number]
    > = {};
    for (const key of Object.keys(periodForm.scheduleLocationMap)) {
      // 해당 schedule ID의 날짜가 새 일정에 있으면 유지
      const sched = periodForm.schedules.find((s) => String(s.id) === key);
      if (sched && newDateSet.has(sched.date)) {
        preservedScheduleLocationMap[key] = periodForm.scheduleLocationMap[key];
      }
    }

    setPeriodForm((prev) => ({
      ...prev,
      schedules: tempSchedules,
      scheduleLocationMap: preservedScheduleLocationMap,
    }));

    setIsSavingSchedule(true);
    try {
      // 일정 수정 API - updateTrainingPeriodSchedule
      const response = await unitApi.updateTrainingPeriodSchedule(trainingPeriodId, {
        startDate: editStartDate,
        endDate: editEndDate,
        excludedDates: editExcludedDates,
      });

      // API 응답에서 크레딧 정보 확인
      const data = response.data || response;
      const deletedCount = data.deleted ?? 0;
      const addedCount = data.added ?? 0;
      const creditsGiven = data.creditsGiven ?? 0;

      // 결과 메시지 표시
      if (deletedCount > 0 || addedCount > 0 || creditsGiven > 0) {
        showSuccess(
          `일정 수정 완료: ${deletedCount}개 삭제, ${addedCount}개 추가` +
            (creditsGiven > 0 ? `, ${creditsGiven}명에게 크레딧 부여` : ''),
        );
      } else {
        showSuccess('일정이 수정되었습니다');
      }

      // 서버 응답으로부터 실제 schedule ID 업데이트
      const schedules = response.schedules || response.data?.schedules;
      if (schedules && Array.isArray(schedules)) {
        const serverSchedules = schedules.map((s: { id: number; date: string }) => ({
          id: s.id,
          date: s.date,
        }));
        setPeriodForm((prev) => ({
          ...prev,
          schedules: serverSchedules,
        }));
      }

      // 부모 컴포넌트에 업데이트된 일정 데이터 전달 (로컬 상태 즉시 업데이트)
      const finalSchedules =
        schedules && Array.isArray(schedules)
          ? schedules.map((s: { id: number; date: string }) => ({ id: s.id, date: s.date }))
          : periodForm.schedules.map((s) => ({ id: s.id ?? 0, date: s.date }));
      _onSave?.(finalSchedules);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('일정 수정 실패:', error);
      showError('일정 수정에 실패했습니다');
      // 실패 시 원래 상태로 복원
      setPeriodForm((prev) => ({
        ...prev,
        schedules: unit.uniqueDates.map((date, idx) => ({ id: idx, date })),
      }));
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // === TrainingPeriodTab 핸들러 ===

  const handlePeriodChange = (field: keyof TrainingPeriodFormData, value: unknown) => {
    setPeriodForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationUpdate = (
    index: number,
    field: keyof LocationData,
    value: LocationData[keyof LocationData],
  ) => {
    setPeriodForm((prev) => {
      const locations = [...prev.locations];
      locations[index] = { ...locations[index], [field]: value };
      return { ...prev, locations };
    });
  };

  const handleLocationAdd = () => {
    setPeriodForm((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          originalPlace: '',
          changedPlace: undefined,
          hasInstructorLounge: false,
          hasWomenRestroom: false,
          note: '',
        },
      ],
    }));
  };

  const handleLocationRemove = (index: number) => {
    setPeriodForm((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  };

  const handleScheduleLocationRowAdd = (scheduleIndex: number) => {
    setPeriodForm((prev) => {
      const schedule = prev.schedules[scheduleIndex];
      const scheduleKey = schedule.id ?? `new-${scheduleIndex}`;
      const currentRows = prev.scheduleLocationMap[scheduleKey] || [];
      return {
        ...prev,
        scheduleLocationMap: {
          ...prev.scheduleLocationMap,
          [scheduleKey]: [
            ...currentRows,
            { trainingLocationId: '', plannedCount: null, actualCount: null, requiredCount: null },
          ],
        },
      };
    });
  };

  const handleScheduleLocationRowRemove = (scheduleIndex: number, rowIndex: number) => {
    setPeriodForm((prev) => {
      const schedule = prev.schedules[scheduleIndex];
      const scheduleKey = schedule.id ?? `new-${scheduleIndex}`;
      const currentRows = prev.scheduleLocationMap[scheduleKey] || [];
      return {
        ...prev,
        scheduleLocationMap: {
          ...prev.scheduleLocationMap,
          [scheduleKey]: currentRows.filter((_, i) => i !== rowIndex),
        },
      };
    });
  };

  const handleScheduleLocationRowChange = (
    scheduleIndex: number,
    rowIndex: number,
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount' | 'requiredCount',
    value: number | string | null,
  ) => {
    setPeriodForm((prev) => {
      const schedule = prev.schedules[scheduleIndex];
      const scheduleKey = schedule.id ?? `new-${scheduleIndex}`;
      const currentRows = [...(prev.scheduleLocationMap[scheduleKey] || [])];

      if (currentRows.length === 0) {
        currentRows.push({
          trainingLocationId: '',
          plannedCount: null,
          actualCount: null,
          requiredCount: null,
        });
      }

      currentRows[rowIndex] = { ...currentRows[rowIndex], [field]: value };
      return {
        ...prev,
        scheduleLocationMap: {
          ...prev.scheduleLocationMap,
          [scheduleKey]: currentRows,
        },
      };
    });
  };

  const handleApplyFirstToAll = () => {
    setPeriodForm((prev) => {
      const firstSchedule = prev.schedules[0];
      if (!firstSchedule) return prev;

      const firstKey = firstSchedule.id ?? 'new-0';
      const firstRows = prev.scheduleLocationMap[firstKey] || [];

      const newMap = { ...prev.scheduleLocationMap };
      prev.schedules.forEach((sched, idx) => {
        if (idx === 0) return;
        const key = sched.id ?? `new-${idx}`;
        newMap[key] = firstRows.map((r) => ({ ...r }));
      });

      return { ...prev, scheduleLocationMap: newMap };
    });
  };

  // === Save Handlers ===

  const handleInfoSave = async () => {
    if (!trainingPeriodId) {
      showError('교육기간 ID가 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      await unitApi.updateTrainingPeriodInfo(trainingPeriodId, {
        name: periodForm.name,
        workStartTime: periodForm.workStartTime || null,
        workEndTime: periodForm.workEndTime || null,
        lunchStartTime: periodForm.lunchStartTime || null,
        lunchEndTime: periodForm.lunchEndTime || null,
        officerName: periodForm.officerName || null,
        officerPhone: periodForm.officerPhone || null,
        officerEmail: periodForm.officerEmail || null,
        hasCateredMeals: periodForm.hasCateredMeals,
        hasHallLodging: periodForm.hasHallLodging,
        allowsPhoneBeforeAfter: periodForm.allowsPhoneBeforeAfter,
      });
      showSuccess('기본 정보가 저장되었습니다');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('기본 정보 저장 실패:', error);
      showError('기본 정보 저장에 실패했습니다');
    }
  };

  const handleLocationsSave = async () => {
    if (!trainingPeriodId) {
      showError('교육기간 ID가 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      // 장소 ID → 이름 매핑
      const locIdToName = new Map<number | string, string>();
      const validLocationIds = new Set<number>();

      for (const loc of periodForm.locations) {
        if (loc.id) {
          locIdToName.set(loc.id, loc.originalPlace);
          validLocationIds.add(loc.id);
        }
        locIdToName.set(loc.originalPlace, loc.originalPlace);
      }

      const scheduleLocations: {
        unitScheduleId: number;
        trainingLocationId?: number;
        locationName?: string;
        plannedCount?: number | null;
        actualCount?: number | null;
        requiredCount?: number | null;
      }[] = [];

      for (let i = 0; i < periodForm.schedules.length; i++) {
        const schedule = periodForm.schedules[i];
        if (!schedule.id) continue;
        const scheduleKey = schedule.id ?? `new-${i}`;
        const entries = periodForm.scheduleLocationMap[scheduleKey] || [];

        for (const entry of entries) {
          if (!entry.trainingLocationId || entry.trainingLocationId === '') {
            continue;
          }

          const locId = Number(entry.trainingLocationId);
          const isValidId = !Number.isNaN(locId) && validLocationIds.has(locId);
          const locationName =
            locIdToName.get(locId) || locIdToName.get(String(entry.trainingLocationId));

          scheduleLocations.push({
            unitScheduleId: schedule.id,
            trainingLocationId: isValidId ? locId : undefined,
            locationName: locationName || String(entry.trainingLocationId),
            plannedCount: entry.plannedCount ?? null,
            actualCount: entry.actualCount ?? null,
            requiredCount: entry.requiredCount ?? null,
          });
        }
      }
      await unitApi.updateTrainingPeriodScheduleLocations(trainingPeriodId, {
        locations: periodForm.locations.map((loc) => ({
          id: loc.id,
          originalPlace: loc.originalPlace,
          changedPlace: loc.changedPlace || null,
          hasInstructorLounge: loc.hasInstructorLounge,
          hasWomenRestroom: loc.hasWomenRestroom,
          note: loc.note || null,
        })),
        scheduleLocations,
      });
      showSuccess('장소 정보가 저장되었습니다');
      // 로컬 상태는 이미 수정되어 있으므로 별도 새로고침 불필요
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('장소 정보 저장 실패:', error);
      showError('장소 정보 저장에 실패했습니다');
    }
  };

  const handleCancelLocations = () => {
    // 원래 데이터로 복원하려면 모달을 닫았다가 다시 열어야 함
    // 여기서는 간단히 닫기 처리
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header - 부대 정보 (읽기전용) */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{unit.unitName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                📍 {detail.wideArea} · {unit.region} · {detail.address || '-'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* 교육기간 일정 수정 섹션 */}
          <div className="p-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  📅 교육기간 일정
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onClick={handleAddExcludedDate}
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

              {/* 일정 수정 버튼 */}
              <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleScheduleSave}
                  disabled={isSavingSchedule}
                  className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSavingSchedule ? '저장 중...' : '일정 수정'}
                </button>
              </div>
            </div>
          </div>

          {/* TrainingPeriodTab - 기본정보 + 장소정보 */}
          <TrainingPeriodTab
            data={periodForm}
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-end shrink-0">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};
