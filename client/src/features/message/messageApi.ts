// src/features/message/messageApi.ts
import { apiClient } from '../../shared/apiClient';

// 메시지 타입 정의
export interface Message {
  messageId: number;
  type: 'Notice' | 'Temporary' | 'Confirmed';
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

export interface Notice {
  id: number;
  type: 'Notice';
  title: string | null;
  body: string | null;
  status: string | null;
  createdAt: string | null;
}

// 내 메시지 목록 조회
export const getMyMessagesApi = async (): Promise<Message[]> => {
  const res = await apiClient('/api/v1/messages');
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

// 공지사항 목록 조회
export const getNoticesApi = async (): Promise<Notice[]> => {
  const res = await apiClient('/api/v1/messages/notices');
  if (!res.ok) {
    throw new Error('공지사항을 불러오는데 실패했습니다.');
  }
  return res.json();
};
