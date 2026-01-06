// client/src/features/dashboard/api/dashboardApi.ts
import { apiClient } from '@/shared/apiClient';

export interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    yearCount: number;
    monthCount: number;
  };
  performance: {
    acceptanceRate: number;
    totalProposals: number;
    acceptedCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    count: number;
    hours: number;
  }>;
  recentAssignments: Array<{
    id: number;
    date: string;
    unitName: string;
    unitType: string | null;
    region: string | null;
    status: string;
    distance: number;
    workHours: number;
  }>;
}

// 페이지네이션된 활동 내역 응답
export interface PaginatedActivities {
  activities: DashboardStats['recentAssignments'];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const dashboardApi = {
  getUserStats: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<DashboardStats> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.period) queryParams.append('period', params.period);

    const queryString = queryParams.toString();
    const url = `/api/v1/dashboard/user/stats${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient(url);
    return response.json();
  },

  getUserActivities: async (params: {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<PaginatedActivities> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', params.page.toString());
    queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period);

    const queryString = queryParams.toString();
    const url = `/api/v1/dashboard/user/activities${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient(url);
    return response.json();
  },
};
