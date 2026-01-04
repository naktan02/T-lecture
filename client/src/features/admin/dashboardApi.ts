import { apiClient } from '../../shared/apiClient';

export interface DashboardStats {
  educationStatus: {
    completed: number;
    inProgress: number;
    scheduled: number;
    unassigned: number;
  };
}

export interface InstructorAnalysis {
  id: number;
  name: string;
  role: string | null;
  team: string | null;
  requestCount: number;
  acceptedCount: number;
  acceptanceRate: number;
  isActive: boolean;
}

export interface TeamAnalysis {
  teamName: string;
  memberCount: number;
  totalAssignments: number;
  averageAssignments: number;
  activeMemberRate: number;
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await apiClient('/api/v1/dashboard/admin/stats');
  if (!res.ok) throw new Error('대시보드 현황 조회 실패');
  return res.json();
};

export const fetchInstructorAnalysis = async (
  year?: number,
  month?: number,
): Promise<InstructorAnalysis[]> => {
  const query = new URLSearchParams();
  if (year) query.append('year', year.toString());
  if (month) query.append('month', month.toString());

  const res = await apiClient(`/api/v1/dashboard/admin/instructors?${query.toString()}`);
  if (!res.ok) throw new Error('강사 분석 데이터 조회 실패');
  return res.json();
};

export const fetchTeamAnalysis = async (): Promise<TeamAnalysis[]> => {
  const res = await apiClient('/api/v1/dashboard/admin/teams');
  if (!res.ok) throw new Error('팀 분석 데이터 조회 실패');
  return res.json();
};
