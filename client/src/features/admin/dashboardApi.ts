import { apiClient } from '../../shared/apiClient';

export type PeriodFilter = '1m' | '3m' | '6m' | '12m';
export type ScheduleStatus = 'completed' | 'inProgress' | 'scheduled' | 'unassigned';

export interface DashboardStats {
  educationStatus: {
    completed: number;
    inProgress: number;
    scheduled: number;
    unassigned: number;
    total: number;
  };
}

export interface InstructorAnalysis {
  id: number;
  name: string;
  role: string | null;
  team: string | null;
  completedCount: number;
  acceptanceRate: number;
  isActive: boolean;
}

export interface TeamAnalysis {
  id: number;
  teamName: string;
  memberCount: number;
  completedCount: number;
  averageCompleted: number;
  activeMemberRate: number;
}

export interface ScheduleListItem {
  id: number;
  unitName: string;
  date: string;
  instructorNames: string[];
}

export interface TeamDetail {
  teamName: string;
  memberCount: number;
  totalCompleted: number;
  averageCompleted: number;
  members: {
    id: number;
    name: string;
    role: string | null;
    completedCount: number;
  }[];
}

export const fetchDashboardStats = async (
  params?: DashboardParams,
  signal?: AbortSignal,
): Promise<DashboardStats> => {
  const query = buildQuery(params);
  const res = await apiClient(`/api/v1/dashboard/admin/stats?${query}`, { signal });
  if (!res.ok) throw new Error('대시보드 현황 조회 실패');
  return res.json();
};

export const fetchSchedulesByStatus = async (
  status: ScheduleStatus,
  signal?: AbortSignal,
): Promise<ScheduleListItem[]> => {
  const res = await apiClient(`/api/v1/dashboard/admin/schedules?status=${status}`, { signal });
  if (!res.ok) throw new Error('교육 일정 조회 실패');
  return res.json();
};

interface DashboardParams {
  period?: PeriodFilter;
  startDate?: string;
  endDate?: string;
}

const buildQuery = (params?: DashboardParams) => {
  const query = new URLSearchParams();
  if (params?.startDate && params?.endDate) {
    query.append('startDate', params.startDate);
    query.append('endDate', params.endDate);
  } else if (params?.period) {
    query.append('period', params.period);
  } else {
    query.append('period', '1m'); // Default
  }
  return query.toString();
};

export const fetchInstructorAnalysis = async (
  params?: DashboardParams,
  signal?: AbortSignal,
): Promise<InstructorAnalysis[]> => {
  const query = buildQuery(params);
  const res = await apiClient(`/api/v1/dashboard/admin/instructors?${query}`, { signal });
  if (!res.ok) throw new Error('강사 분석 데이터 조회 실패');
  return res.json();
};

export const fetchTeamAnalysis = async (
  params?: DashboardParams,
  signal?: AbortSignal,
): Promise<TeamAnalysis[]> => {
  const query = buildQuery(params);
  const res = await apiClient(`/api/v1/dashboard/admin/teams?${query}`, { signal });
  if (!res.ok) throw new Error('팀 분석 데이터 조회 실패');
  return res.json();
};

export const fetchTeamDetail = async (
  teamId: number,
  params?: DashboardParams,
  signal?: AbortSignal,
): Promise<TeamDetail> => {
  const query = buildQuery(params);
  const res = await apiClient(`/api/v1/dashboard/admin/teams/${teamId}?${query}`, { signal });
  if (!res.ok) throw new Error('팀 상세 조회 실패');
  return res.json();
};

// 부대 단위 조회 (Unit-based)
export interface UnitListItem {
  id: number;
  name: string;
  status: ScheduleStatus;
  scheduleCount: number;
  instructorCount: number;
  dateRange: string;
}

export interface UnitDetail {
  id: number;
  name: string;
  status: ScheduleStatus;
  address: string | null;
  addressDetail: string | null;
  officerName: string | null;
  officerPhone: string | null;
  schedules: {
    id: number;
    date: string;
    instructors: { id: number; name: string }[];
  }[];
}

export const fetchUnitsByStatus = async (
  status: ScheduleStatus,
  signal?: AbortSignal,
): Promise<UnitListItem[]> => {
  const res = await apiClient(`/api/v1/dashboard/admin/units?status=${status}`, { signal });
  if (!res.ok) throw new Error('부대 목록 조회 실패');
  return res.json();
};

export const fetchUnitDetail = async (unitId: number): Promise<UnitDetail> => {
  const res = await apiClient(`/api/v1/dashboard/admin/units/${unitId}`);
  if (!res.ok) throw new Error('부대 상세 조회 실패');
  return res.json();
};
