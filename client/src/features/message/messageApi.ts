// src/features/message/messageApi.ts
import { apiClient } from '../../shared/apiClient';

// 메시지 타입 정의 (배정 메시지 전용)
export interface Message {
  messageId: number;
  type: 'Temporary' | 'Confirmed';
  title: string | null;
  body: string | null;
  status: string | null;
  receivedAt: string | null;
  readAt: string | null;
  isRead: boolean;
  // 연결된 배정 정보 (응답용)
  assignments?: Array<{
    unitScheduleId: number;
    state: string;
  }>;
}

// 메시지 목록 응답 타입
export interface MessageListResponse {
  messages: Message[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

// 메시지 조회 파라미터
export interface MessageSearchParams {
  type?: 'Temporary' | 'Confirmed';
  page?: number;
  limit?: number;
}

// 내 메시지 목록 조회 (페이지네이션 지원)
export const getMyMessagesApi = async (
  params: MessageSearchParams = {},
): Promise<MessageListResponse> => {
  const { type, page = 1, limit = 10 } = params;
  const urlParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (type) {
    urlParams.append('type', type);
  }

  const res = await apiClient(`/api/v1/messages?${urlParams.toString()}`);
  if (!res.ok) {
    throw new Error('메시지 목록을 불러오는데 실패했습니다.');
  }
  return res.json();
};

// 메시지 읽음 처리
export const markMessageAsReadApi = async (messageId: number): Promise<{ success: boolean }> => {
  const res = await apiClient(`/api/v1/messages/${messageId}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error('읽음 처리에 실패했습니다.');
  }
  return res.json();
};

// 확정 메시지 일괄 발송
export const sendConfirmedMessagesApi = async (): Promise<{ createdCount: number }> => {
  const res = await apiClient('/api/v1/messages/send/confirmed', {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '확정 메시지 발송에 실패했습니다.');
  }
  return res.json();
};
