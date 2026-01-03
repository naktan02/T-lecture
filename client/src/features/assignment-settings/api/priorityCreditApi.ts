// client/src/features/assignment-settings/api/priorityCreditApi.ts
import { apiClient } from '../../../shared/apiClient';

export interface PriorityCredit {
  id: number;
  instructorId: number;
  credits: number;
  createdAt: string;
  updatedAt: string;
  instructor: {
    user: { id: number; name: string | null };
    team: { id: number; name: string | null } | null;
  };
}

const BASE_PATH = '/api/v1/metadata/priority-credits';

export const priorityCreditApi = {
  // 목록 조회
  getAll: async (): Promise<PriorityCredit[]> => {
    const res = await apiClient(BASE_PATH);
    return res.json();
  },

  // 추가
  add: async (instructorId: number, credits: number = 1): Promise<PriorityCredit> => {
    const res = await apiClient(BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({ instructorId, credits }),
    });
    return res.json();
  },

  // 수정
  update: async (instructorId: number, credits: number): Promise<PriorityCredit> => {
    const res = await apiClient(`${BASE_PATH}/${instructorId}`, {
      method: 'PUT',
      body: JSON.stringify({ credits }),
    });
    return res.json();
  },

  // 삭제
  delete: async (instructorId: number): Promise<void> => {
    await apiClient(`${BASE_PATH}/${instructorId}`, {
      method: 'DELETE',
    });
  },
};
