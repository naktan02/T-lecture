// client/src/features/unit/api/unitApi.ts
import { apiClient } from '../../../shared/apiClient';

interface UnitListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

interface UnitData {
  name: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  educationStart?: string;
  educationEnd?: string;
  workStartTime?: string;
  workEndTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  trainingLocations?: unknown[];
  excludedDates?: unknown[];
  schedules?: unknown[];
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

    const response = await apiClient('/api/v1/units/upload/excel', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined as unknown as string },
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

  // 삭제
  deleteUnit: async (id: number | string) => {
    await apiClient(`/api/v1/units/${id}`, { method: 'DELETE' });
  },

  // 다중 삭제
  deleteUnits: async (ids: (number | string)[]) => {
    const response = await apiClient(`/api/v1/units/batch/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
    return response.json();
  },
};
