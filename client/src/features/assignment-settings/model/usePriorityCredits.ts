// client/src/features/assignment-settings/model/usePriorityCredits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priorityCreditApi, PriorityCredit } from '../api/priorityCreditApi';
import { showSuccess, showError } from '../../../shared/utils';

const QUERY_KEY = ['priority-credits'] as const;

export const usePriorityCredits = () => {
  const queryClient = useQueryClient();

  // 목록 조회
  const { data: credits = [], isLoading } = useQuery<PriorityCredit[]>({
    queryKey: QUERY_KEY,
    queryFn: priorityCreditApi.getAll,
  });

  // 추가
  const addMutation = useMutation({
    mutationFn: ({ instructorId, credits = 1 }: { instructorId: number; credits?: number }) =>
      priorityCreditApi.add(instructorId, credits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('우선배정 크레딧이 추가되었습니다.');
    },
    onError: () => showError('우선배정 크레딧 추가에 실패했습니다.'),
  });

  // 수정
  const updateMutation = useMutation({
    mutationFn: ({ instructorId, credits }: { instructorId: number; credits: number }) =>
      priorityCreditApi.update(instructorId, credits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('우선배정 크레딧이 수정되었습니다.');
    },
    onError: () => showError('우선배정 크레딧 수정에 실패했습니다.'),
  });

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (instructorId: number) => priorityCreditApi.delete(instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccess('우선배정 크레딧이 삭제되었습니다.');
    },
    onError: () => showError('우선배정 크레딧 삭제에 실패했습니다.'),
  });

  return {
    credits,
    isLoading,
    addCredit: addMutation.mutate,
    updateCredit: updateMutation.mutate,
    deleteCredit: deleteMutation.mutate,
    isUpdating: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};
