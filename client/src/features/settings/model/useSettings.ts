// client/src/features/settings/model/useSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getVirtues,
  createVirtue,
  updateVirtue,
  deleteVirtue,
  getTemplates,
  updateTemplate,
  Team,
  Virtue,
  MessageTemplate,
} from '../settingsApi';
import { showSuccess, showError } from '../../../shared/utils';

// Query Keys
const QUERY_KEYS = {
  teams: ['settings', 'teams'] as const,
  virtues: ['settings', 'virtues'] as const,
  templates: ['settings', 'templates'] as const,
};

// 팀 관리 훅
export const useTeams = () => {
  const queryClient = useQueryClient();

  const teamsQuery = useQuery<Team[]>({
    queryKey: QUERY_KEYS.teams,
    queryFn: getTeams,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createTeam(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      showSuccess('팀이 추가되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '팀 추가에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateTeam(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      showSuccess('팀 이름이 수정되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '팀 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams });
      showSuccess('팀이 삭제되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '팀 삭제에 실패했습니다.');
    },
  });

  return {
    teams: teamsQuery.data ?? [],
    isLoading: teamsQuery.isLoading,
    createTeam: createMutation.mutate,
    updateTeam: updateMutation.mutate,
    deleteTeam: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// 덕목 관리 훅
export const useVirtues = () => {
  const queryClient = useQueryClient();

  const virtuesQuery = useQuery<Virtue[]>({
    queryKey: QUERY_KEYS.virtues,
    queryFn: getVirtues,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createVirtue(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtues });
      showSuccess('덕목이 추가되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '덕목 추가에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateVirtue(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtues });
      showSuccess('덕목이 수정되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '덕목 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVirtue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.virtues });
      showSuccess('덕목이 삭제되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '덕목 삭제에 실패했습니다.');
    },
  });

  return {
    virtues: virtuesQuery.data ?? [],
    isLoading: virtuesQuery.isLoading,
    createVirtue: createMutation.mutate,
    updateVirtue: updateMutation.mutate,
    deleteVirtue: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// 메시지 템플릿 관리 훅
export const useTemplates = () => {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery<MessageTemplate[]>({
    queryKey: QUERY_KEYS.templates,
    queryFn: getTemplates,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, title, body }: { key: string; title: string; body: string }) =>
      updateTemplate(key, title, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates });
      showSuccess('템플릿이 수정되었습니다.');
    },
    onError: (error: Error) => {
      showError(error.message || '템플릿 수정에 실패했습니다.');
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    updateTemplate: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
