// src/features/message/model/useMessageInbox.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getMyMessagesApi,
  getNoticesApi,
  markMessageAsReadApi,
  Message,
  Notice,
} from '../messageApi';
import { showError } from '../../../shared/utils/toast';

interface UseMessageInboxReturn {
  messages: Message[];
  notices: Notice[];
  isLoading: boolean;
  error: string | null;
  markAsRead: (messageId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMessageInbox = (): UseMessageInboxReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [messagesData, noticesData] = await Promise.all([getMyMessagesApi(), getNoticesApi()]);

      setMessages(messagesData);
      setNotices(noticesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.';
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAsRead = async (messageId: number) => {
    try {
      await markMessageAsReadApi(messageId);
      // 로컬 상태 업데이트
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m,
        ),
      );
    } catch {
      // 읽음 처리 실패해도 UX에 영향 없도록 무시
    }
  };

  return {
    messages,
    notices,
    isLoading,
    error,
    markAsRead,
    refresh: fetchData,
  };
};
