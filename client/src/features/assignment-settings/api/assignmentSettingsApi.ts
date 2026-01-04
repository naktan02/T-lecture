// client/src/features/assignment-settings/api/assignmentSettingsApi.ts
import { apiClient } from '../../../shared/apiClient';

export interface AssignmentConfig {
  key: string;
  value: string;
  description: string;
}

const BASE_PATH = '/api/v1/metadata/assignment-configs';

export const assignmentSettingsApi = {
  // 배정 설정 조회
  getConfigs: async (): Promise<AssignmentConfig[]> => {
    const res = await apiClient(BASE_PATH);
    return res.json();
  },

  // 배정 설정 수정
  updateConfig: async (key: string, value: string): Promise<AssignmentConfig> => {
    const res = await apiClient(`${BASE_PATH}/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
    return res.json();
  },
};
