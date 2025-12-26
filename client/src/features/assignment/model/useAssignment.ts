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
  // UI에서 ConfirmModal로 확인하므로 여기서는 바로 실행
  const executeAutoAssign = async (): Promise<void> => {
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
    fetchData,
    executeAutoAssign,
    saveAssignments,
    removeAssignment,
  };
};
