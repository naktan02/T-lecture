// src/features/dispatch/dispatchApi.ts
import { apiClient } from '../../shared/apiClient';

// 발송 타입 정의 (배정 발송 전용)
export interface Dispatch {
  dispatchId: number;
  type: 'Temporary' | 'Confirmed';
  title: string | null;
  body: string | null;
  status: string | null;
  receivedAt: string | null;
  readAt: string | null;
  isRead: boolean;
  // 연결된 배정 정보 (응답용)
  assignments?: Array<{
    unitScheduleId: number;
    state: string;
  }>;
}

// 발송 목록 응답 타입
export interface DispatchListResponse {
  dispatches: Dispatch[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

// 발송 조회 파라미터
export interface DispatchSearchParams {
  type?: 'Temporary' | 'Confirmed';
  page?: number;
  limit?: number;
}

// 내 발송 목록 조회 (페이지네이션 지원)
export const getMyDispatchesApi = async (
  params: DispatchSearchParams = {},
): Promise<DispatchListResponse> => {
  const { type, page = 1, limit = 10 } = params;
  const urlParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (type) {
    urlParams.append('type', type);
  }

  const res = await apiClient(`/api/v1/dispatches?${urlParams.toString()}`);
  if (!res.ok) {
    throw new Error('발송 목록을 불러오는데 실패했습니다.');
  }
  return res.json();
};

// 발송 읽음 처리
export const markDispatchAsReadApi = async (dispatchId: number): Promise<{ success: boolean }> => {
  const res = await apiClient(`/api/v1/dispatches/${dispatchId}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error('읽음 처리에 실패했습니다.');
  }
  return res.json();
};

// 확정 발송 일괄 발송 (날짜 범위 필터링)
export const sendConfirmedDispatchesApi = async (
  startDate?: string,
  endDate?: string,
): Promise<{ createdCount: number; message: string }> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const url = `/api/v1/dispatches/send/confirmed${params.toString() ? `?${params}` : ''}`;
  const res = await apiClient(url, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '확정 발송에 실패했습니다.');
  }
  return res.json();
};
