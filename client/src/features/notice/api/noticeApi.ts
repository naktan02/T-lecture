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
}

export const noticeApi = {
  getNotices: async (params: NoticeSearchParams = {}) => {
    const { page = 1, limit = 10, search } = params;
    const urlParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      urlParams.append('search', search);
    }
    const response = await apiClient(`/api/v1/notices?${urlParams.toString()}`);
    return response.json() as Promise<NoticeListResponse>;
  },

  getNotice: async (id: number) => {
    const response = await apiClient(`/api/v1/notices/${id}`);
    return response.json() as Promise<Notice>;
  },

  createNotice: async (data: { title: string; content: string; isPinned?: boolean }) => {
    const response = await apiClient(`/api/v1/notices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<Notice>;
  },

  updateNotice: async (
    id: number,
    data: { title?: string; content?: string; isPinned?: boolean },
  ) => {
    const response = await apiClient(`/api/v1/notices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<Notice>;
  },

  deleteNotice: async (id: number) => {
    await apiClient(`/api/v1/notices/${id}`, {
      method: 'DELETE',
    });
  },

  togglePin: async (id: number) => {
    const response = await apiClient(`/api/v1/notices/${id}/pin`, {
      method: 'PATCH',
    });
    return response.json() as Promise<Notice>;
  },
};
