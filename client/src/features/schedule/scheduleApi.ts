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

export interface AvailabilityMonthUpdate {
  year: number;
  month: number;
  dates: number[];
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

/**
 * 강사 가용 일정 다중 월 수정
 * PUT /api/v1/instructor/availability/bulk
 * body: { months: [{ year, month, dates }] }
 */
export const updateAvailabilityBulk = async (
  months: AvailabilityMonthUpdate[],
): Promise<UpdateAvailabilityResponse> => {
  const res = await apiClient('/api/v1/instructor/availability/bulk', {
    method: 'PUT',
    body: JSON.stringify({ months }),
  });
  return res.json();
};

/**
 * 강사 근무가능일 수정 잠금 기준일 조회
 * GET /api/v1/metadata/availability-cutoff
 * 반환: { cutoffDate: string | null }  (YYYY-MM-DD 또는 null)
 */
export const getAvailabilityCutoff = async (): Promise<string | null> => {
  const res = await apiClient('/api/v1/metadata/availability-cutoff');
  const data: { cutoffDate: string | null } = await res.json();
  return data.cutoffDate;
};
