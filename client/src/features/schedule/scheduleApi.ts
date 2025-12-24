// src/features/schedule/scheduleApi.ts
import { apiClient } from '../../shared/apiClient';

export interface AvailabilityDate {
  date: string;
  isAvailable: boolean;
}

export interface AvailabilityResponse {
  data: AvailabilityDate[];
}

export interface UpdateAvailabilityResponse {
  message: string;
}

/**
 * 강사 가용 일정 조회
 * GET /api/v1/instructor/availability?year=2024&month=12
 */
export const getMyAvailability = async (
  year: number,
  month: number,
): Promise<AvailabilityDate[]> => {
  const res = await apiClient(`/api/v1/instructor/availability?year=${year}&month=${month}`);
  const data: AvailabilityResponse = await res.json();
  return data.data;
};

/**
 * 강사 가용 일정 수정
 * PUT /api/v1/instructor/availability
 * body: { year, month, dates: number[] } - dates는 일(day) 숫자 배열
 */
export const updateAvailability = async (
  year: number,
  month: number,
  dates: number[],
): Promise<UpdateAvailabilityResponse> => {
  const res = await apiClient('/api/v1/instructor/availability', {
    method: 'PUT',
    body: JSON.stringify({ year, month, dates }),
  });
  return res.json();
};
