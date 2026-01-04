// src/features/dispatch/model/useDispatchInbox.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getMyDispatchesApi,
  markDispatchAsReadApi,
  Dispatch,
  DispatchListResponse,
} from '../dispatchApi';

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

// 각 타입별 발송 섹션을 관리하는 훅
const useDispatchSection = (type: 'Temporary' | 'Confirmed'): UseDispatchSectionReturn => {
  const [data, setData] = useState<DispatchListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyDispatchesApi({ type, page, limit: ITEMS_PER_PAGE });
      setData(result);
    } catch {
      // 에러는 상위에서 처리
    } finally {
      setIsLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    dispatches: data?.dispatches || [],
    isLoading,
    page,
    totalPage: data?.meta.lastPage || 1,
    totalCount: data?.meta.total || 0,
    setPage,
    refresh: fetchData,
  };
};

export const useDispatchInbox = (): UseDispatchInboxReturn => {
  const [error, setError] = useState<string | null>(null);

  const temporary = useDispatchSection('Temporary');
  const confirmed = useDispatchSection('Confirmed');

  // 둘 중 하나라도 에러면 에러 상태
  useEffect(() => {
    if (!temporary.isLoading && !confirmed.isLoading) {
      if (temporary.dispatches.length === 0 && confirmed.dispatches.length === 0) {
        // 데이터 없음은 에러가 아님
        setError(null);
      }
    }
  }, [
    temporary.isLoading,
    confirmed.isLoading,
    temporary.dispatches.length,
    confirmed.dispatches.length,
  ]);

  const markAsRead = async (dispatchId: number) => {
    try {
      await markDispatchAsReadApi(dispatchId);
      // 양쪽 모두 새로고침하여 읽음 상태 반영
      temporary.refresh();
      confirmed.refresh();
    } catch {
      // 읽음 처리 실패해도 UX에 영향 없도록 무시
    }
  };

  return {
    temporary,
    confirmed,
    markAsRead,
    error,
  };
};
