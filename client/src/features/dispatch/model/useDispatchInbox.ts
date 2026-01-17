// src/features/dispatch/model/useDispatchInbox.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyDispatchesApi,
  markDispatchAsReadApi,
  Dispatch,
  DispatchListResponse,
} from '../dispatchApi';
import { useState } from 'react';

const ITEMS_PER_PAGE = 10;

interface UseDispatchSectionReturn {
  dispatches: Dispatch[];
  isLoading: boolean;
  page: number;
  totalPage: number;
  totalCount: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

interface UseDispatchInboxReturn {
  temporary: UseDispatchSectionReturn;
  confirmed: UseDispatchSectionReturn;
  markAsRead: (dispatchId: number) => Promise<void>;
  error: string | null;
}

// 현재 로그인된 유저 ID 가져오기
const getCurrentUserId = (): number | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
  } catch {
    // JSON 파싱 실패 시 null 반환
  }
  return null;
};

// React Query 기반 섹션 훅 (로그아웃 시 캐시 정리됨)
const useDispatchSection = (type: 'Temporary' | 'Confirmed'): UseDispatchSectionReturn => {
  const [page, setPage] = useState(1);
  const userId = getCurrentUserId();

  // userId를 queryKey에 포함시켜 유저별 캐시 분리
  const queryKey = ['dispatches', userId, type, page];

  const { data, isLoading, refetch } = useQuery<DispatchListResponse>({
    queryKey,
    queryFn: () => getMyDispatchesApi({ type, page, limit: ITEMS_PER_PAGE }),
    staleTime: 30 * 1000, // 30초 동안 캐시 유지
    enabled: !!userId, // userId가 있을 때만 쿼리 실행
  });

  const refresh = async () => {
    await refetch();
  };

  return {
    dispatches: data?.dispatches || [],
    isLoading,
    page,
    totalPage: data?.meta.lastPage || 1,
    totalCount: data?.meta.total || 0,
    setPage,
    refresh,
  };
};

export const useDispatchInbox = (): UseDispatchInboxReturn => {
  const queryClient = useQueryClient();

  const temporary = useDispatchSection('Temporary');
  const confirmed = useDispatchSection('Confirmed');

  const markAsRead = async (dispatchId: number) => {
    try {
      await markDispatchAsReadApi(dispatchId);
      // React Query 캐시 무효화로 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
    } catch {
      // 읽음 처리 실패해도 UX에 영향 없도록 무시
    }
  };

  return {
    temporary,
    confirmed,
    markAsRead,
    error: null,
  };
};
