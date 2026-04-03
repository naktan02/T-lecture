import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyDispatchesApi,
  markDispatchAsReadApi,
  Dispatch,
  DispatchListResponse,
} from '../dispatchApi';

const ITEMS_PER_PAGE = 5;

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

const getCurrentUserId = (): number | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
  } catch {
    return null;
  }

  return null;
};

const useDispatchSection = (type: 'Temporary' | 'Confirmed'): UseDispatchSectionReturn => {
  const [page, setPage] = useState(1);
  const userId = getCurrentUserId();
  const queryKey = ['dispatches', userId, type, page];

  const { data, isLoading, refetch } = useQuery<DispatchListResponse>({
    queryKey,
    queryFn: () => getMyDispatchesApi({ type, page, limit: ITEMS_PER_PAGE }),
    staleTime: 30 * 1000,
    enabled: !!userId,
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
      await queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      await queryClient.invalidateQueries({ queryKey: ['userHeaderCounts'] });
    } catch {
      return;
    }
  };

  return {
    temporary,
    confirmed,
    markAsRead,
    error: null,
  };
};
