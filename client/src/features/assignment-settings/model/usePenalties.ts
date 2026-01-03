// client/src/features/assignment-settings/model/usePenalties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { penaltyApi, Penalty } from '../api/penaltyApi';
import { showSuccess, showError } from '../../../shared/utils';

const QUERY_KEY = ['penalties'] as const;

export const usePenalties = () => {
  const queryClient = useQueryClient();

  // 패널티 목록 조회
  const { data: penalties = [], isLoading } = useQuery<Penalty[]>({
    queryKey: QUERY_KEY,
    queryFn: penaltyApi.getPenalties,
  });

  // 패널티 추가
  const addMutation = useMutation({
    mutationFn: ({ userId, days }: { userId: number; days: number }) =>
      penaltyApi.addPenalty(userId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('패널티가 추가되었습니다.');
    },
    onError: () => showError('패널티 추가에 실패했습니다.'),
  });

  // 패널티 수정
  const updateMutation = useMutation({
    mutationFn: ({ userId, expiresAt }: { userId: number; expiresAt: string }) =>
      penaltyApi.updatePenalty(userId, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('패널티가 수정되었습니다.');
    },
    onError: () => showError('패널티 수정에 실패했습니다.'),
  });

  // 패널티 삭제
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => penaltyApi.deletePenalty(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('패널티가 삭제되었습니다.');
    },
    onError: () => showError('패널티 삭제에 실패했습니다.'),
  });

  return {
    penalties,
    isLoading,
    addPenalty: addMutation.mutate,
    updatePenalty: updateMutation.mutate,
    deletePenalty: deleteMutation.mutate,
    isUpdating: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};
