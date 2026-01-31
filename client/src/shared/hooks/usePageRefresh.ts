// client/src/shared/hooks/usePageRefresh.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { showSuccess } from '../utils';

/**
 * 페이지 데이터 새로고침 훅
 * 헤더의 새로고침 버튼과 연결하여 현재 페이지의 쿼리를 무효화합니다.
 */
export const usePageRefresh = (queryKeys?: string[]) => {
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    if (queryKeys && queryKeys.length > 0) {
      // 특정 쿼리만 무효화
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    } else {
      // 모든 쿼리 무효화
      queryClient.invalidateQueries();
    }
    showSuccess('새로고침 완료');
  }, [queryClient, queryKeys]);

  return refresh;
};
