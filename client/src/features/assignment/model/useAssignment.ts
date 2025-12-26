// src/features/assignment/model/useAssignment.ts
import { useState, useCallback } from 'react';
import {
  getAssignmentCandidates,
  postAutoAssignment,
  cancelAssignmentApi,
  UnitSchedule,
  Instructor,
} from '../assignmentApi';
import { logger, showSuccess, showError, showInfo, showConfirm } from '../../../shared/utils';

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

interface UseAssignmentReturn {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  loading: boolean;
  error: string | null;
  unassignedUnits: UnitSchedule[];
  availableInstructors: Instructor[];
  assignments: AssignmentData[];
  fetchData: () => Promise<void>;
  executeAutoAssign: () => Promise<void>;
  saveAssignments: () => Promise<void>;
  removeAssignment: (unitScheduleId: number, instructorId: number) => Promise<void>;
}

export const useAssignment = (): UseAssignmentReturn => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
  });

  const [sourceData, setSourceData] = useState<SourceData>({
    units: [],
    instructors: [],
  });

  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. 데이터 조회
  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const startStr = dateRange.startDate.toISOString().split('T')[0];
      const endStr = dateRange.endDate.toISOString().split('T')[0];

      const data = await getAssignmentCandidates(startStr, endStr);

      setSourceData({
        units: data.unassignedUnits || [],
        instructors: data.availableInstructors || [],
      });
      setAssignments([]); // 초기화
    } catch (err) {
      setError((err as Error).message || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 2. 자동 배정 실행 (API 호출)
  const executeAutoAssign = async (): Promise<void> => {
    // UI에서 확인 모달 처리하므로 여기서 confirm 제거
    showConfirm('현재 조건으로 자동 배정을 실행하시겠습니까?', async () => {
      setLoading(true);
      try {
        const startStr = dateRange.startDate.toISOString().split('T')[0];
        const endStr = dateRange.endDate.toISOString().split('T')[0];

        // 서버 API 호출 -> 계층형 결과 수신
        const result = await postAutoAssignment(startStr, endStr);
        logger.debug('서버 응답 데이터:', result);
        const resultData = (result as unknown as { data?: AssignmentData[] }).data;
        if (!resultData) {
          logger.error('데이터 구조가 이상합니다!', result);
        }
        setAssignments(resultData || []);
        showSuccess('배정이 완료되었습니다.');
      } catch (err) {
        logger.error(err);
        showError((err as Error).message);
      } finally {
        setLoading(false);
      }
    });
  };

  // 3. 저장 로직 (이미 서버에 저장된 상태를  불러오므로 여기선 새로고침 정도만)
  const saveAssignments = async (): Promise<void> => {
    showInfo('서버에 이미 저장된 상태입니다. (재조회)');
    fetchData();
  };

  const removeAssignment = async (unitScheduleId: number, instructorId: number): Promise<void> => {
    showConfirm('배정을 취소하시겠습니까?', async () => {
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
    });
  };

  return {
    dateRange,
    setDateRange,
    loading,
    error,
    unassignedUnits: sourceData.units,
    availableInstructors: sourceData.instructors,
    assignments,
    fetchData,
    executeAutoAssign,
    saveAssignments,
    removeAssignment,
  };
};
