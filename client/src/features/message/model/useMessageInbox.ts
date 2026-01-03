// src/features/message/model/useMessageInbox.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getMyMessagesApi,
  markMessageAsReadApi,
  Message,
  MessageListResponse,
} from '../messageApi';
import { showError } from '../../../shared/utils/toast';

const ITEMS_PER_PAGE = 10;

interface UseMessageSectionReturn {
  messages: Message[];
  isLoading: boolean;
  page: number;
  totalPage: number;
  totalCount: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
}

interface UseMessageInboxReturn {
  temporary: UseMessageSectionReturn;
  confirmed: UseMessageSectionReturn;
  markAsRead: (messageId: number) => Promise<void>;
  error: string | null;
}

// 각 타입별 메시지 섹션을 관리하는 훅
const useMessageSection = (type: 'Temporary' | 'Confirmed'): UseMessageSectionReturn => {
  const [data, setData] = useState<MessageListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyMessagesApi({ type, page, limit: ITEMS_PER_PAGE });
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
    messages: data?.messages || [],
    isLoading,
    page,
    totalPage: data?.meta.lastPage || 1,
    totalCount: data?.meta.total || 0,
    setPage,
    refresh: fetchData,
  };
};

export const useMessageInbox = (): UseMessageInboxReturn => {
  const [error, setError] = useState<string | null>(null);

  const temporary = useMessageSection('Temporary');
  const confirmed = useMessageSection('Confirmed');

  // 둘 중 하나라도 에러면 에러 상태
  useEffect(() => {
    if (!temporary.isLoading && !confirmed.isLoading) {
      if (temporary.messages.length === 0 && confirmed.messages.length === 0) {
        // 데이터 없음은 에러가 아님
        setError(null);
      }
    }
  }, [
    temporary.isLoading,
    confirmed.isLoading,
    temporary.messages.length,
    confirmed.messages.length,
  ]);

  const markAsRead = async (messageId: number) => {
    try {
      await markMessageAsReadApi(messageId);
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
