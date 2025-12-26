// client/src/features/userManagement/model/useUserManagement.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, Dispatch, SetStateAction } from 'react';
import {
  userManagementApi,
  User,
  UserFilters,
  UpdateUserDto,
  PaginationMeta,
} from '../api/userManagementApi';
import { showSuccess, showError } from '../../../shared/utils';

interface SearchParams {
  status?: string;
  role?: string;
  name?: string;
  teamId?: string | number;
  category?: string;
  availableOn?: string;
}

interface UseUserManagementReturn {
  users: User[];
  meta: PaginationMeta;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  isLoading: boolean;
  isError: boolean;
  // Actions
  updateUser: (params: { id: number; data: UpdateUserDto }) => void;
  deleteUser: (id: number) => void;
  approveUser: (id: number) => Promise<void>;
  rejectUser: (id: number) => Promise<void>;
  approveUsersBulk: (ids: number[]) => Promise<void>;
  rejectUsersBulk: (ids: number[]) => Promise<void>;
  pendingCount: number;
}

export const useUserManagement = (searchParams: SearchParams = {}): UseUserManagementReturn => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // 유저 목록 조회
  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['adminUsers', page, limit, searchParams],
    queryFn: () =>
      userManagementApi.getUsers({
        page,
        limit,
        ...searchParams,
      }),
  });

  // 승인 대기 유저 수 조회 (전체)
  const { data: pendingResponse } = useQuery({
    queryKey: ['adminUsersPendingCount'],
    queryFn: () =>
      userManagementApi.getUsers({
        status: 'PENDING',
        page: 1,
        limit: 1,
      }),
    staleTime: 30 * 1000, // 30초
  });

  // 데이터 추출
  const users: User[] = Array.isArray(response?.data) ? response.data : [];
  const meta: PaginationMeta = response?.meta || {
    total: 0,
    page: 1,
    limit: 20,
    lastPage: 1,
  };
  const pendingCount = pendingResponse?.meta?.total || 0;

  // 유저 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserDto }) => {
      return userManagementApi.updateUser(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail'] });
      showSuccess('유저 정보가 수정되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '수정 중 오류가 발생했습니다.');
    },
  });

  // 유저 삭제
  const deleteMutation = useMutation({
    mutationFn: userManagementApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess('유저가 삭제되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '삭제 중 오류가 발생했습니다.');
    },
  });

  // 유저 승인
  const approveMutation = useMutation({
    mutationFn: userManagementApi.approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess('유저가 승인되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '승인 중 오류가 발생했습니다.');
    },
  });

  // 유저 거절
  const rejectMutation = useMutation({
    mutationFn: userManagementApi.rejectUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess('유저가 거절되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '거절 중 오류가 발생했습니다.');
    },
  });

  // 일괄 승인
  const approveBulkMutation = useMutation({
    mutationFn: userManagementApi.approveUsersBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess(res.message || '일괄 승인되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '일괄 승인 중 오류가 발생했습니다.');
    },
  });

  // 일괄 거절
  const rejectBulkMutation = useMutation({
    mutationFn: userManagementApi.rejectUsersBulk,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showSuccess(res.message || '일괄 거절되었습니다.');
    },
    onError: (err: Error) => {
      showError(err.message || '일괄 거절 중 오류가 발생했습니다.');
    },
  });

  return {
    users,
    meta,
    page,
    setPage,
    isLoading,
    isError,
    pendingCount,
    // Actions
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    approveUser: async (id: number) => {
      await approveMutation.mutateAsync(id);
    },
    rejectUser: async (id: number) => {
      await rejectMutation.mutateAsync(id);
    },
    approveUsersBulk: async (ids: number[]) => {
      await approveBulkMutation.mutateAsync(ids);
    },
    rejectUsersBulk: async (ids: number[]) => {
      await rejectBulkMutation.mutateAsync(ids);
    },
  };
};
