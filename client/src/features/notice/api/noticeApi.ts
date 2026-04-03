import { apiClient } from '../../../shared/apiClient';

export interface NoticeAttachment {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  isImage: boolean;
}

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
  targetSetting?: {
    targetType: 'ALL' | 'TEAM' | 'INDIVIDUAL';
    targetTeamIds: number[];
    targetUserIds: number[];
  };
  attachments: NoticeAttachment[];
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
  viewAs?: string;
}

export interface NoticeUpsertPayload {
  title: string;
  content: string;
  isPinned?: boolean;
  targetType?: 'ALL' | 'TEAM' | 'INDIVIDUAL';
  targetTeamIds?: number[];
  targetUserIds?: number[];
  files?: File[];
  removeAttachmentIds?: number[];
}

const BASE_PATH = '/api/v1/notices';

const normalizeNotice = (notice: unknown): Notice => {
  const value =
    typeof notice === 'object' && notice
      ? (notice as Partial<Notice> & Record<string, unknown>)
      : {};

  return {
    id: Number(value.id),
    title: typeof value.title === 'string' ? value.title : '',
    content: typeof value.content === 'string' ? value.content : '',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    viewCount: typeof value.viewCount === 'number' ? value.viewCount : 0,
    isPinned: Boolean(value.isPinned),
    author: {
      name:
        typeof value.author === 'object' &&
        value.author &&
        'name' in value.author &&
        typeof (value.author as { name?: unknown }).name === 'string'
          ? ((value.author as { name: string | null }).name ?? null)
          : null,
    },
    targetSetting:
      typeof value.targetSetting === 'object' && value.targetSetting
        ? (value.targetSetting as Notice['targetSetting'])
        : undefined,
    attachments: Array.isArray(value.attachments)
      ? (value.attachments as NoticeAttachment[])
      : [],
  };
};

const normalizeNoticeListResponse = (
  payload: Partial<NoticeListResponse> & Record<string, unknown>,
): NoticeListResponse => ({
  notices: Array.isArray(payload.notices) ? payload.notices.map((notice) => normalizeNotice(notice)) : [],
  meta: {
    total:
      typeof payload.meta === 'object' &&
      payload.meta &&
      'total' in payload.meta &&
      typeof (payload.meta as { total?: unknown }).total === 'number'
        ? (payload.meta as { total: number }).total
        : 0,
    page:
      typeof payload.meta === 'object' &&
      payload.meta &&
      'page' in payload.meta &&
      typeof (payload.meta as { page?: unknown }).page === 'number'
        ? (payload.meta as { page: number }).page
        : 1,
    lastPage:
      typeof payload.meta === 'object' &&
      payload.meta &&
      'lastPage' in payload.meta &&
      typeof (payload.meta as { lastPage?: unknown }).lastPage === 'number'
        ? (payload.meta as { lastPage: number }).lastPage
        : 1,
  },
});

const buildNoticeFormData = (data: NoticeUpsertPayload) => {
  const formData = new FormData();

  formData.append('title', data.title);
  formData.append('content', data.content);
  formData.append('isPinned', String(Boolean(data.isPinned)));
  formData.append('targetType', data.targetType || 'ALL');

  if (data.targetTeamIds) {
    formData.append('targetTeamIds', JSON.stringify(data.targetTeamIds));
  }

  if (data.targetUserIds) {
    formData.append('targetUserIds', JSON.stringify(data.targetUserIds));
  }

  if (data.removeAttachmentIds && data.removeAttachmentIds.length > 0) {
    formData.append('removeAttachmentIds', JSON.stringify(data.removeAttachmentIds));
  }

  for (const file of data.files || []) {
    formData.append('files', file);
  }

  return formData;
};

const triggerBrowserDownload = async (response: Response, fallbackName: string) => {
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const contentDisposition = response.headers.get('Content-Disposition');
  const matchedName = contentDisposition?.match(/filename\*=UTF-8''(.+)/);

  anchor.href = objectUrl;
  anchor.download = matchedName ? decodeURIComponent(matchedName[1]) : fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
};

export const noticeApi = {
  getNotices: async (params: NoticeSearchParams = {}) => {
    const { page = 1, limit = 10, search, sortField, sortOrder, viewAs } = params;
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
    if (viewAs) {
      urlParams.append('viewAs', viewAs);
    }

    const response = await apiClient(`${BASE_PATH}?${urlParams.toString()}`);
    const payload = (await response.json()) as Partial<NoticeListResponse> & Record<string, unknown>;
    return normalizeNoticeListResponse(payload);
  },

  getNotice: async (id: number, options?: { viewAs?: string }) => {
    const urlParams = new URLSearchParams();
    if (options?.viewAs) {
      urlParams.append('viewAs', options.viewAs);
    }

    const response = await apiClient(
      `${BASE_PATH}/${id}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`,
    );
    const payload = (await response.json()) as Partial<Notice> & Record<string, unknown>;
    return normalizeNotice(payload);
  },

  createNotice: async (data: NoticeUpsertPayload) => {
    const response = await apiClient(BASE_PATH, {
      method: 'POST',
      body: buildNoticeFormData(data),
    });

    const payload = (await response.json()) as Partial<Notice> & Record<string, unknown>;
    return normalizeNotice(payload);
  },

  updateNotice: async (id: number, data: NoticeUpsertPayload) => {
    const response = await apiClient(`${BASE_PATH}/${id}`, {
      method: 'PUT',
      body: buildNoticeFormData(data),
    });

    const payload = (await response.json()) as Partial<Notice> & Record<string, unknown>;
    return normalizeNotice(payload);
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
    const payload = (await response.json()) as Partial<Notice> & Record<string, unknown>;
    return normalizeNotice(payload);
  },

  downloadAttachment: async (attachmentId: number, fallbackName: string) => {
    const response = await apiClient(`${BASE_PATH}/attachments/${attachmentId}/download`);
    await triggerBrowserDownload(response, fallbackName);
  },
};
