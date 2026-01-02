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

export const dashboardApi = {
  getUserStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DashboardStats> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const url = `/api/v1/dashboard/user/stats${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient(url);
    return response.json();
  },
};
