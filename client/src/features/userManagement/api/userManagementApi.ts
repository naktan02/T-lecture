// client/src/features/userManagement/api/userManagementApi.ts
import { apiClient } from '../../../shared/apiClient';

// 타입 정의
export interface UserFilters {
  status?: string; // PENDING | APPROVED | RESTING | INACTIVE | ALL
  role?: string; // ADMIN | INSTRUCTOR | NORMAL
  name?: string; // 검색어
  page?: number;
  limit?: number;
}

export interface InstructorInfo {
  userId: number;
  category?: 'Main' | 'Co' | 'Assistant' | 'Practicum' | null;
  teamId?: number | null;
  isTeamLeader?: boolean;
  location?: string | null;
  generation?: number | null;
  restrictedArea?: string | null;
  lat?: number | null;
  lng?: number | null;
  profileCompleted?: boolean;
  team?: {
    id: number;
    name?: string | null;
  } | null;
}

export interface AdminInfo {
  id: number;
  userId: number;
  level: 'GENERAL' | 'SUPER';
}

export interface User {
  id: number;
  userEmail?: string | null;
  name?: string | null;
  userphoneNumber?: string | null;
  status: 'PENDING' | 'APPROVED' | 'RESTING' | 'INACTIVE';
  instructor?: InstructorInfo | null;
  admin?: AdminInfo | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

export interface UsersResponse {
  data: User[];
  meta: PaginationMeta;
}

export interface UpdateUserDto {
  name?: string;
  phoneNumber?: string;
  status?: string;
  address?: string;
  isTeamLeader?: boolean;
  // 관리자 직접 관리 필드 (강사용)
  category?: 'Main' | 'Co' | 'Assistant' | 'Practicum';
  teamId?: number | null;
  generation?: number | null;
  restrictedArea?: string | null;
}

export interface UserActionResponse {
  message: string;
  user?: User;
  count?: number;
}

// API 함수들
export const userManagementApi = {
  // 유저 목록 조회 (페이지네이션)
  getUsers: async (filters: UserFilters = {}): Promise<UsersResponse> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.role) params.append('role', filters.role);
    if (filters.name) params.append('name', filters.name);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/api/v1/admin/users${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient(url);
    if (!res.ok) throw new Error('유저 목록 조회 실패');
    return res.json();
  },

  // 단일 유저 조회
  getUser: async (id: number): Promise<User> => {
    const res = await apiClient(`/api/v1/admin/users/${id}`);
    if (!res.ok) throw new Error('유저 조회 실패');
    return res.json();
  },

  // 유저 정보 수정
  updateUser: async (id: number, data: UpdateUserDto): Promise<User> => {
    const res = await apiClient(`/api/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('유저 수정 실패');
    return res.json();
  },

  // 유저 삭제
  deleteUser: async (id: number): Promise<UserActionResponse> => {
    const res = await apiClient(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('유저 삭제 실패');
    return res.json();
  },

  // 승인 대기 유저 조회
  getPendingUsers: async (): Promise<User[]> => {
    const res = await apiClient('/api/v1/admin/users/pending');
    if (!res.ok) throw new Error('승인 대기 목록 조회 실패');
    return res.json();
  },

  // 개별 승인
  approveUser: async (id: number): Promise<UserActionResponse> => {
    const res = await apiClient(`/api/v1/admin/users/${id}/approve`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('승인 실패');
    return res.json();
  },

  // 일괄 승인
  approveUsersBulk: async (userIds: number[]): Promise<UserActionResponse> => {
    const res = await apiClient('/api/v1/admin/users/bulk-approve', {
      method: 'PATCH',
      body: JSON.stringify({ userIds }),
    });
    if (!res.ok) throw new Error('일괄 승인 실패');
    return res.json();
  },

  // 개별 거절
  rejectUser: async (id: number): Promise<UserActionResponse> => {
    const res = await apiClient(`/api/v1/admin/users/${id}/reject`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('거절 실패');
    return res.json();
  },

  // 일괄 거절
  rejectUsersBulk: async (userIds: number[]): Promise<UserActionResponse> => {
    const res = await apiClient('/api/v1/admin/users/bulk-reject', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
    if (!res.ok) throw new Error('일괄 거절 실패');
    return res.json();
  },
};
