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
  assignments: AssignmentData[]; // 임시 배정 (Pending)
  confirmedAssignments: AssignmentData[]; // 확정 배정 (Accepted)
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
  const [confirmedAssignments, setConfirmedAssignments] = useState<AssignmentData[]>([]);
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

      // 배정 현황 설정 (상태별 분리)
      const pending = (data as any).pendingAssignments || [];
      const accepted = (data as any).acceptedAssignments || [];
      setAssignments(pending); // 임시 배정
      setConfirmedAssignments(accepted); // 확정 배정
    } catch (err) {
      setError((err as Error).message || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 2. 자동 배정 실행 (DB에 바로 저장)
  const executeAutoAssign = async (): Promise<void> => {
    setLoading(true);
    try {
      const startStr = dateRange.startDate.toISOString().split('T')[0];
      const endStr = dateRange.endDate.toISOString().split('T')[0];

      // 서버 API 호출 -> 바로 저장됨
      const result = await postAutoAssignment(startStr, endStr);

      logger.debug('자동 배정 결과:', result);
      showSuccess(`${result.summary.created}건 배정 완료! (${result.summary.skipped}건 건너뜀)`);

      // 배정 결과 설정 (result.data에 계층형 배정 데이터가 있음)
      setAssignments(result.data as AssignmentData[]);
    } catch (err) {
      logger.error(err);
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 저장은 이미 자동 배정에서 처리됨 (빈 함수 유지 for 인터페이스 호환)
  const saveAssignments = async (): Promise<void> => {
    showInfo('자동 배정 시 이미 저장되었습니다.');
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
    confirmedAssignments,
    fetchData,
    executeAutoAssign,
    saveAssignments,
    removeAssignment,
  };
};
