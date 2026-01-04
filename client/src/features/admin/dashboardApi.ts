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

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient('/api/v1/dashboard/admin/stats');
  if (!res.ok) throw new Error('대시보드 현황 조회 실패');
  return res.json();
};

export const fetchSchedulesByStatus = async (
  status: ScheduleStatus,
): Promise<ScheduleListItem[]> => {
  const res = await apiClient(`/api/v1/dashboard/admin/schedules?status=${status}`);
  if (!res.ok) throw new Error('교육 일정 조회 실패');
  return res.json();
};

export const fetchInstructorAnalysis = async (
  period: PeriodFilter = '1m',
): Promise<InstructorAnalysis[]> => {
  const res = await apiClient(`/api/v1/dashboard/admin/instructors?period=${period}`);
  if (!res.ok) throw new Error('강사 분석 데이터 조회 실패');
  return res.json();
};

export const fetchTeamAnalysis = async (period: PeriodFilter = '1m'): Promise<TeamAnalysis[]> => {
  const res = await apiClient(`/api/v1/dashboard/admin/teams?period=${period}`);
  if (!res.ok) throw new Error('팀 분석 데이터 조회 실패');
  return res.json();
};

export const fetchTeamDetail = async (
  teamId: number,
  period: PeriodFilter = '1m',
): Promise<TeamDetail> => {
  const res = await apiClient(`/api/v1/dashboard/admin/teams/${teamId}?period=${period}`);
  if (!res.ok) throw new Error('팀 상세 조회 실패');
  return res.json();
};
