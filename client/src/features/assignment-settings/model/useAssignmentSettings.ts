// client/src/features/assignment-settings/model/useAssignmentSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentSettingsApi, AssignmentConfig } from '../api/assignmentSettingsApi';
import { showSuccess, showError } from '../../../shared/utils';

const QUERY_KEY = ['assignment-configs'] as const;

export const useAssignmentSettings = () => {
  const queryClient = useQueryClient();

  // 설정 조회
  const { data: configs = [], isLoading } = useQuery<AssignmentConfig[]>({
    queryKey: QUERY_KEY,
    queryFn: assignmentSettingsApi.getConfigs,
  });

  // 설정 수정
  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      assignmentSettingsApi.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('설정이 저장되었습니다.');
    },
    onError: () => showError('설정 저장에 실패했습니다.'),
  });

  // 키로 설정값 조회
  const getConfigValue = (key: string): string => {
    const config = configs.find((c) => c.key === key);
    return config?.value ?? '';
  };

  return {
    configs,
    isLoading,
    getConfigValue,
    updateConfig: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
