// client/src/features/dashboard/api/dashboardApi.ts
import { apiClient } from '@/shared/apiClient';

// 활동 내역 일자 정보
export interface ActivityDate {
  date: string;
  workHours: number;
}

// 활동 내역 (교육 기간 단위)
export interface ActivityGroup {
  trainingPeriodId: number;
  unitName: string;
  unitType: string | null;
  region: string | null;
  trainingPeriodName: string;
  distance: number; // km, 왕복
  totalWorkHours: number;
  dates: ActivityDate[];
}

export interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    periodCount: number; // 선택한 기간 내 완료된 교육 건수
  };
  performance: {
    rejectionRate: number;
    totalProposals: number;
    rejectedCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    count: number;
    hours: number;
  }>;
  recentActivities: ActivityGroup[]; // 교육 기간 단위로 그룹화
}

// 페이지네이션된 활동 내역 응답
export interface PaginatedActivities {
  activities: ActivityGroup[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const dashboardApi = {
  getUserStats: async (
    params?: {
      startDate?: string;
      endDate?: string;
      period?: string;
    },
    signal?: AbortSignal,
  ): Promise<DashboardStats> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.period) queryParams.append('period', params.period);

    const queryString = queryParams.toString();
    const url = `/api/v1/dashboard/user/stats${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient(url, { signal });
    return response.json();
  },

  getUserActivities: async (
    params: {
      page: number;
      limit: number;
      startDate?: string;
      endDate?: string;
      period?: string;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedActivities> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period);

    const queryString = queryParams.toString();
    const url = `/api/v1/dashboard/user/activities${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient(url, { signal });
    return response.json();
  },
};
