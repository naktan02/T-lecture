// client/src/features/assignment-settings/api/penaltyApi.ts
import { apiClient } from '../../../shared/apiClient';

export interface Penalty {
  id: number;
  userId: number;
  count: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    instructor: {
      team: { id: number; name: string | null } | null;
    } | null;
  };
}

const BASE_PATH = '/api/v1/metadata/penalties';

export const penaltyApi = {
  // 패널티 목록 조회
  getPenalties: async (): Promise<Penalty[]> => {
    const res = await apiClient(BASE_PATH);
    return res.json();
  },

  // 패널티 추가
  addPenalty: async (userId: number, days: number): Promise<Penalty> => {
    const res = await apiClient(BASE_PATH, {
      method: 'POST',
      body: JSON.stringify({ userId, days }),
    });
    return res.json();
  },

  // 패널티 만료일 수정
  updatePenalty: async (userId: number, expiresAt: string): Promise<Penalty> => {
    const res = await apiClient(`${BASE_PATH}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ expiresAt }),
    });
    return res.json();
  },

  // 패널티 삭제
  deletePenalty: async (userId: number): Promise<void> => {
    await apiClient(`${BASE_PATH}/${userId}`, {
      method: 'DELETE',
    });
  },
};
