// client/src/features/admin/adminApi.ts
import { apiClient } from '../../shared/apiClient';
import type { AdminLevel } from '../../shared/constants/roles';

// 타입 정의
export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  adminLevel?: string;
  createdAt: string;
  instructorMeta?: {
    mainArea: string;
    subArea: string;
    career: number;
    bank: string;
    accountNumber: string;
    hasVehicle: boolean;
  };
}

export interface UsersResponse {
  users: User[];
}

export interface UserActionResponse {
  message: string;
  user?: User;
}

// 1. 유저 목록 조회
export const fetchUsers = async (): Promise<UsersResponse> => {
  // URL 앞부분(API_BASE_URL)은 apiClient가 알아서 붙여줌
  const res = await apiClient('/api/v1/admin/users');

  // apiClient는 response 객체를 반환하므로 .json() 등은 여기서 처리
  if (!res.ok) throw new Error('승인 유저 조회 실패');
  return res.json();
};

// 2. 승인 대기 목록 조회
export const fetchPendingUsers = async (): Promise<UsersResponse> => {
  const res = await apiClient('/api/v1/admin/users/pending');
  if (!res.ok) throw new Error('승인 대기 목록 조회 실패');
  return res.json();
};

// 3. 승인
export const approveUserApi = async (userId: number): Promise<UserActionResponse> => {
  const res = await apiClient(`/api/v1/admin/users/${userId}/approve`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('승인 실패');
  return res.json();
};

// 4. 거절
export const rejectUserApi = async (userId: number): Promise<UserActionResponse> => {
  const res = await apiClient(`/api/v1/admin/users/${userId}/reject`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('거절 실패');
  return res.json();
};

// 5. 관리자 권한 부여
export const grantAdminApi = async (
  userId: number,
  level: AdminLevel,
): Promise<UserActionResponse> => {
  const res = await apiClient(`/api/v1/admin/users/${userId}/admin`, {
    method: 'PATCH',
    body: JSON.stringify({ level }),
  });
  if (!res.ok) throw new Error('관리자 권한 부여 실패');
  return res.json();
};

// 6. 관리자 권한 회수
export const revokeAdminApi = async (userId: number): Promise<UserActionResponse> => {
  const res = await apiClient(`/api/v1/admin/users/${userId}/admin`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('관리자 권한 회수 실패');
  return res.json();
};
