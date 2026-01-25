// client/src/features/unit/api/unitApi.ts
import { apiClient } from '../../../shared/apiClient';
import {
  CreateTrainingPeriodPayload,
  UpdateUnitWithPeriodsPayload,
} from '../../../shared/types/unit.types';

interface UnitListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface UnitData {
  name: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  educationStart?: string | null;
  educationEnd?: string | null;
  // 교육불가 일자 목록 (개별 날짜 배열)
  excludedDates?: string[];
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
  trainingLocations?: unknown[];
  schedules?: { id?: number; date?: string | null }[];
  [key: string]: unknown;
}

export const unitApi = {
  // 상세 조회
  getUnit: async (id: number | string) => {
    const response = await apiClient(`/api/v1/units/${id}`);
    return response.json();
  },

  // 목록 조회
  getUnitList: async (params: UnitListParams = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            acc[k] = String(v);
          }
          return acc;
        },
        {} as Record<string, string>,
      ),
    ).toString();
    const response = await apiClient(`/api/v1/units?${queryString}`);
    return response.json();
  },

  // 등록
  registerUnit: async (data: UnitData) => {
    const response = await apiClient('/api/v1/units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 엑셀 업로드
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    // FormData 전송 시 Content-Type은 apiClient에서 자동 처리됨
    const response = await apiClient('/api/v1/units/upload/excel', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  // 엑셀 양식 다운로드
  downloadExcelTemplate: async () => {
    const response = await apiClient('/api/v1/units/template/excel');
    const blob = await response.blob();

    // 파일 다운로드 트리거
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unit-upload-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // 부대 전체 정보 수정 (기본정보 + 교육장소 + 일정)
  updateUnit: async (id: number | string, data: UpdateUnitWithPeriodsPayload) => {
    const response = await apiClient(`/api/v1/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 기본 정보 수정
  updateUnitBasic: async (id: number | string, data: Partial<UnitData>) => {
    const response = await apiClient(`/api/v1/units/${id}/basic`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 담당자 정보 수정
  updateUnitOfficer: async (id: number | string, data: Partial<UnitData>) => {
    const response = await apiClient(`/api/v1/units/${id}/officer`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 주소만 수정 (좌표 재계산)
  updateUnitAddress: async (id: number | string, addressDetail: string) => {
    const response = await apiClient(`/api/v1/units/${id}/address`, {
      method: 'PATCH',
      body: JSON.stringify({ addressDetail }),
    });
    return response.json();
  },

  // 일정만 수정 (교육기간 단위: 시작일, 종료일, 교육불가일자)
  updateTrainingPeriodSchedule: async (
    trainingPeriodId: number,
    data: {
      startDate: string;
      endDate: string;
      excludedDates: string[];
    },
  ) => {
    const response = await apiClient(
      `/api/v1/units/training-periods/${trainingPeriodId}/schedule`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
    return response.json();
  },

  // 일정-장소/인원 + 장소 목록 저장
  updateTrainingPeriodScheduleLocations: async (
    trainingPeriodId: number,
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
      }>;
    },
  ) => {
    const response = await apiClient(
      `/api/v1/units/training-periods/${trainingPeriodId}/schedule-locations`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
    return response.json();
  },

  // 교육기간 생성 (즉시 저장)
  createTrainingPeriod: async (unitId: number, data: CreateTrainingPeriodPayload) => {
    const response = await apiClient(`/api/v1/units/${unitId}/training-periods`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 교육기간 삭제
  deleteTrainingPeriod: async (trainingPeriodId: number) => {
    const response = await apiClient(`/api/v1/units/training-periods/${trainingPeriodId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 스케줄 삭제 전 배정 확인 (배정된 강사가 있는지 체크)
  checkScheduleAssignments: async (
    trainingPeriodId: number,
    schedulesToDelete: string[], // 삭제될 날짜 목록 (YYYY-MM-DD)
  ) => {
    const response = await apiClient(
      `/api/v1/units/training-periods/${trainingPeriodId}/schedule/check`,
      {
        method: 'POST',
        body: JSON.stringify({ schedulesToDelete }),
      },
    );
    return response.json() as Promise<{
      hasAssignments: boolean;
      affectedInstructors: { name: string; date: string }[];
    }>;
  },

  // 삭제
  deleteUnit: async (id: number | string) => {
    await apiClient(`/api/v1/units/${id}`, { method: 'DELETE' });
  },

  // 다중 삭제
  deleteUnits: async (ids: (number | string)[], all?: boolean, filter?: UnitListParams) => {
    const response = await apiClient(`/api/v1/units/batch/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ ids, all, filter }),
    });
    return response.json();
  },
};
