import { apiClient } from '../../../shared/apiClient';

export interface Inquiry {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  status: 'Waiting' | 'Answered';
  author: {
    name: string | null;
  };
  answer: string | null;
  answeredAt: string | null;
  answeredBy: {
    name: string | null;
  };
}

export interface InquiryListResponse {
  inquiries: Inquiry[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    waitingCount: number;
  };
}

export interface InquirySearchParams {
  page?: number;
  limit?: number;
  status?: 'Waiting' | 'Answered';
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// API 경로: /api/v1/inquiries (독립 도메인)
const BASE_PATH = '/api/v1/inquiries';

export const inquiryApi = {
  // 문의사항 목록 조회
  getInquiries: async (params: InquirySearchParams = {}) => {
    const { page = 1, limit = 10, status, search, sortField, sortOrder } = params;
    const urlParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      urlParams.append('status', status);
    }
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
    return response.json() as Promise<InquiryListResponse>;
  },

  // 문의사항 단건 조회
  getInquiry: async (id: number) => {
    const response = await apiClient(`${BASE_PATH}/${id}`);
    return response.json() as Promise<Inquiry>;
  },

  // 문의사항 생성
  createInquiry: async (data: { title: string; content: string }) => {
    const response = await apiClient(`${BASE_PATH}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<Inquiry>;
  },

  // 문의사항 답변 (관리자)
  answerInquiry: async (id: number, answer: string) => {
    const response = await apiClient(`${BASE_PATH}/${id}/answer`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    });
    return response.json() as Promise<Inquiry>;
  },

  // 문의사항 삭제
  deleteInquiry: async (id: number) => {
    await apiClient(`${BASE_PATH}/${id}`, {
      method: 'DELETE',
    });
  },
};
