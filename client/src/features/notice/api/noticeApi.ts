import { apiClient } from '../../../shared/apiClient';

export interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  isPinned: boolean;
  author: {
    name: string | null;
  };
}

export interface NoticeListResponse {
  notices: Notice[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface NoticeSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// API 경로: /api/v1/notices (독립 도메인)
const BASE_PATH = '/api/v1/notices';

export const noticeApi = {
  getNotices: async (params: NoticeSearchParams = {}) => {
    const { page = 1, limit = 10, search, sortField, sortOrder } = params;
    const urlParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      urlParams.append('search', search);
    }
    if (sortField) {
      urlParams.append('sortField', sortField);
    }
    if (sortOrder) {
      urlParams.append('sortOrder', sortOrder);
    }
    const response = await apiClient(`${BASE_PATH}?${urlParams.toString()}`);
    return response.json() as Promise<NoticeListResponse>;
  },

  getNotice: async (id: number) => {
    const response = await apiClient(`${BASE_PATH}/${id}`);
    return response.json() as Promise<Notice>;
  },

  createNotice: async (data: {
    title: string;
    content: string;
    isPinned?: boolean;
    targetType?: 'ALL' | 'TEAM' | 'INDIVIDUAL';
    targetTeamIds?: number[];
    targetUserIds?: number[];
  }) => {
    const response = await apiClient(`${BASE_PATH}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<Notice>;
  },

  updateNotice: async (
    id: number,
    data: { title?: string; content?: string; isPinned?: boolean },
  ) => {
    const response = await apiClient(`${BASE_PATH}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<Notice>;
  },

  deleteNotice: async (id: number) => {
    await apiClient(`${BASE_PATH}/${id}`, {
      method: 'DELETE',
    });
  },

  togglePin: async (id: number) => {
    const response = await apiClient(`${BASE_PATH}/${id}/pin`, {
      method: 'PATCH',
    });
    return response.json() as Promise<Notice>;
  },
};
