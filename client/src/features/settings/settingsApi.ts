// client/src/features/settings/settingsApi.ts
import { apiClient } from '../../shared/apiClient';
import type { Token } from './ui/template-editor/types';

// 타입 정의
export interface Team {
  id: number;
  name: string | null;
}

export interface Virtue {
  id: number;
  name: string | null;
}

// MessageTemplate body는 JSONB로 Token 배열 형태
export interface MessageTemplateBody {
  tokens: Token[];
}

// 포맷 변수별 프리셋
export type FormatPresets = Record<string, string>;

export interface MessageTemplate {
  key: string;
  title: string;
  body: MessageTemplateBody;
  formatPresets: FormatPresets | null;
  updatedAt: string;
}

// 팀 API
export const getTeams = async (): Promise<Team[]> => {
  const res = await apiClient('/api/v1/metadata/teams');
  return res.json();
};

export const createTeam = async (name: string): Promise<Team> => {
  const res = await apiClient('/api/v1/metadata/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.json();
};

export const updateTeam = async (id: number, name: string): Promise<Team> => {
  const res = await apiClient(`/api/v1/metadata/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return res.json();
};

export const deleteTeam = async (id: number): Promise<void> => {
  await apiClient(`/api/v1/metadata/teams/${id}`, {
    method: 'DELETE',
  });
};

// 덕목 API
export const getVirtues = async (): Promise<Virtue[]> => {
  const res = await apiClient('/api/v1/metadata/virtues');
  return res.json();
};

export const createVirtue = async (name: string): Promise<Virtue> => {
  const res = await apiClient('/api/v1/metadata/virtues', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.json();
};

export const updateVirtue = async (id: number, name: string): Promise<Virtue> => {
  const res = await apiClient(`/api/v1/metadata/virtues/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return res.json();
};

export const deleteVirtue = async (id: number): Promise<void> => {
  await apiClient(`/api/v1/metadata/virtues/${id}`, {
    method: 'DELETE',
  });
};

// 메시지 템플릿 API
export const getTemplates = async (): Promise<MessageTemplate[]> => {
  const res = await apiClient('/api/v1/metadata/templates');
  return res.json();
};

export const updateTemplate = async (
  key: string,
  title: string,
  body: MessageTemplateBody,
  formatPresets?: FormatPresets | null,
): Promise<MessageTemplate> => {
  const res = await apiClient(`/api/v1/metadata/templates/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ title, body, formatPresets }),
  });
  return res.json();
};
