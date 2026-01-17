// src/features/assignment/model/useAssignment.ts
import { useState, useCallback } from 'react';
import {
  getAssignmentCandidates,
  postAutoAssignment,
  cancelAssignmentApi,
  sendTemporaryMessagesApi,
  UnitSchedule,
  Instructor,
  addAssignmentApi,
  toggleStaffLockApi,
} from '../assignmentApi';
import { sendConfirmedDispatchesApi } from '../../dispatch/dispatchApi';
import { logger, showSuccess, showError } from '../../../shared/utils';
import {
  groupUnassignedUnits,
  GroupedUnassignedUnit,
  LocationSchedule,
} from './groupUnassignedUnits';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SourceData {
  units: UnitSchedule[];
  instructors: Instructor[];
}

// AssignmentGroup과 호환되는 타입
export interface AssignmentData {
  unitId: number;
  unitName: string;
  region: string;
  period: string;
  trainingLocations: unknown[];
  totalAssigned: number;
  totalRequired: number;
  progress: number;
  [key: string]: unknown;
}

// 타입은 groupUnassignedUnits.ts에서 re-export
export type { GroupedUnassignedUnit, LocationSchedule };

interface UseAssignmentReturn {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  loading: boolean;
  error: string | null;
  unassignedUnits: UnitSchedule[]; // raw data (하위 호환성)
  groupedUnassignedUnits: GroupedUnassignedUnit[]; // 부대별 그룹화
  availableInstructors: Instructor[];
  assignments: AssignmentData[]; // 임시 배정 (Pending)
  confirmedAssignments: AssignmentData[]; // 확정 배정 (Accepted)
  addAssignment: (
    unitScheduleId: number,
    instructorId: number,
    trainingLocationId: number | null,
  ) => Promise<void>;
  toggleStaffLock: (unitId: number, isStaffLocked: boolean) => Promise<void>; // 인원고정
  fetchData: () => Promise<void>;
  executeAutoAssign: () => Promise<void>;
  sendTemporaryMessages: () => Promise<void>;
  sendConfirmedMessages: () => Promise<void>; // 확정 발송
  removeAssignment: (unitScheduleId: number, instructorId: number) => Promise<void>;
}

export const useAssignment = (): UseAssignmentReturn => {
  // 초기 날짜를 자정으로 설정 (시분초 제거)
  const getInitialDateRange = (): DateRange => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(today.getDate() + 7);
    return { startDate: today, endDate: weekLater };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange);

  const [sourceData, setSourceData] = useState<SourceData>({
    units: [],
    instructors: [],
  });

  // 서버에서 계산된 실제 날짜 범위 (부대 전체 일정 커버)
  const [actualDateRange, setActualDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [confirmedAssignments, setConfirmedAssignments] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 로컬 날짜를 YYYY-MM-DD 문자열로 변환 (타임존 문제 방지)
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. 데이터 조회
  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const startStr = toLocalDateString(dateRange.startDate);
      const endStr = toLocalDateString(dateRange.endDate);

      const data = await getAssignmentCandidates(startStr, endStr);

      setSourceData({
        units: data.unassignedUnits || [],
        instructors: data.availableInstructors || [],
      });

      // 서버에서 계산된 실제 날짜 범위 저장
      if (data.actualDateRange) {
        setActualDateRange(data.actualDateRange);
      }

      // 배정 현황 설정 (상태별 분리) - 첫 날짜 기준 정렬
      const pending = (data as any).pendingAssignments || [];
      const accepted = (data as any).acceptedAssignments || [];

      // 날짜 기준 정렬 헬퍼
      const sortByFirstDate = (a: AssignmentData, b: AssignmentData) => {
        const aDate = a.period?.split(' ~ ')[0] || '';
        const bDate = b.period?.split(' ~ ')[0] || '';
        return aDate.localeCompare(bDate);
      };

      setAssignments(pending.sort(sortByFirstDate)); // 임시 배정
      setConfirmedAssignments(accepted.sort(sortByFirstDate)); // 확정 배정
    } catch (err) {
      setError((err as Error).message || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 2. 자동 배정 실행 (ID 기반 하이브리드)
  const executeAutoAssign = async (): Promise<void> => {
    setLoading(true);
    try {
      // 화면에 표시된 스케줄 ID 추출
      const scheduleIds: number[] = [];
      for (const unit of groupUnassignedUnits(sourceData.units)) {
        for (const loc of unit.locations) {
          for (const sched of loc.schedules) {
            const schedId = parseInt(sched.scheduleId, 10);
            if (!isNaN(schedId) && !scheduleIds.includes(schedId)) {
              scheduleIds.push(schedId);
            }
          }
        }
      }

      // 화면에 표시된 강사 ID 추출
      const instructorIds = sourceData.instructors.map((i) => i.id);

      if (scheduleIds.length === 0) {
        showError('배정할 스케줄이 없습니다.');
        return;
      }
      if (instructorIds.length === 0) {
        showError('배정 가능한 강사가 없습니다.');
        return;
      }

      // 서버 API 호출 -> 바로 저장됨
      const result = await postAutoAssignment(scheduleIds, instructorIds);

      logger.debug('자동 배정 결과:', result);
      showSuccess(`${result.summary.created}건 배정 완료! (${result.summary.skipped}건 건너뜀)`);

      // 전체 데이터 새로고침 (pendingAssignments, acceptedAssignments 포함)
      await fetchData();
    } catch (err) {
      logger.error(err);
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 임시 배정 메시지 일괄 발송 (부대 전체 일정 범위 사용)
  const sendTemporaryMessages = async (): Promise<void> => {
    setLoading(true);
    try {
      // 서버에서 계산한 실제 날짜 범위 사용 (없으면 화면 날짜 범위 fallback)
      const startStr = actualDateRange?.startDate || toLocalDateString(dateRange.startDate);
      const endStr = actualDateRange?.endDate || toLocalDateString(dateRange.endDate);
      const result = await sendTemporaryMessagesApi(startStr, endStr);
      showSuccess(result.message);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 4. 확정 배정 메시지 일괄 발송 (부대 전체 일정 범위 사용)
  const sendConfirmedMessages = async (): Promise<void> => {
    setLoading(true);
    try {
      // 서버에서 계산한 실제 날짜 범위 사용 (없으면 화면 날짜 범위 fallback)
      const startStr = actualDateRange?.startDate || toLocalDateString(dateRange.startDate);
      const endStr = actualDateRange?.endDate || toLocalDateString(dateRange.endDate);
      const result = await sendConfirmedDispatchesApi(startStr, endStr);
      showSuccess(result.message || `확정 발송 ${result.createdCount}건 완료`);
      await fetchData();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 배정 취소 (모달에서 확인 후 호출됨)
  const removeAssignment = async (unitScheduleId: number, instructorId: number): Promise<void> => {
    try {
      setLoading(true);
      await cancelAssignmentApi(unitScheduleId, instructorId);
      showSuccess('배정이 취소되었습니다.');

      // 화면 갱신을 위해 데이터 재조회
      await fetchData();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const addAssignment = async (
    unitScheduleId: number,
    instructorId: number,
    trainingLocationId: number | null,
  ): Promise<void> => {
    try {
      setLoading(true);
      await addAssignmentApi(unitScheduleId, instructorId, trainingLocationId);
      showSuccess('강사가 추가 배정되었습니다.');
      await fetchData();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 부대 인원고정 설정/해제
  const toggleStaffLock = async (unitId: number, isStaffLocked: boolean): Promise<void> => {
    try {
      setLoading(true);
      await toggleStaffLockApi(unitId, isStaffLocked);
      showSuccess(isStaffLocked ? '인원고정 설정 완료' : '인원고정 해제');
      await fetchData();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 부대별 그룹화 (유틸 함수 사용)
  const groupedUnassignedUnits = groupUnassignedUnits(sourceData.units);

  return {
    dateRange,
    setDateRange,
    loading,
    error,
    unassignedUnits: sourceData.units,
    groupedUnassignedUnits,
    availableInstructors: sourceData.instructors,
    assignments,
    confirmedAssignments,
    fetchData,
    executeAutoAssign,
    sendTemporaryMessages,
    sendConfirmedMessages,
    removeAssignment,
    addAssignment,
    toggleStaffLock,
  };
};
