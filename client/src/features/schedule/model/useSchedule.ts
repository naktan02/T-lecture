// src/features/schedule/model/useSchedule.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyAvailability, updateAvailability, AvailabilityDate } from '../scheduleApi';
import { showSuccess, showError, showConfirm } from '../../../shared/utils';

// Query key 생성 함수
const scheduleQueryKey = (year: number, month: number) => ['schedule', 'availability', year, month];

export const useSchedule = (year: number, month: number) => {
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // 월별 가용일 조회 (캐싱 적용)
  const {
    data: availableDates,
    isLoading: fetching,
    error,
    refetch,
  } = useQuery({
    queryKey: scheduleQueryKey(year, month),
    queryFn: async () => {
      const data = await getMyAvailability(year, month);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 30 * 60 * 1000, // 30분간 캐시 유지
    retry: 1,
  });

  // availableDates가 변경될 때마다 selectedDays 동기화 (페이지 복귀 시 복원)
  useEffect(() => {
    if (availableDates && availableDates.length > 0) {
      const days = availableDates
        .filter((d) => d.isAvailable)
        .map((d) => new Date(d.date).getDate());
      setSelectedDays(days);
    } else {
      setSelectedDays([]);
    }
  }, [availableDates]);

  // 저장 뮤테이션 (Optimistic Update 적용)
  const saveMutation = useMutation({
    mutationFn: () => updateAvailability(year, month, selectedDays),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: scheduleQueryKey(year, month) });

      const previousData = queryClient.getQueryData<AvailabilityDate[]>(
        scheduleQueryKey(year, month),
      );

      const newData: AvailabilityDate[] = selectedDays.map((day) => {
        const year_str = year.toString();
        const month_str = month.toString().padStart(2, '0');
        const day_str = day.toString().padStart(2, '0');
        return {
          date: `${year_str}-${month_str}-${day_str}`,
          isAvailable: true,
        };
      });

      queryClient.setQueryData(scheduleQueryKey(year, month), newData);

      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(scheduleQueryKey(year, month), context.previousData);
      }
      showError(err.message || '저장 중 오류가 발생했습니다.');
    },
    onSuccess: () => {
      showSuccess('일정이 저장되었습니다.');
    },
  });

  // 날짜 토글 (day: 1~31)
  const toggleDay = useCallback(
    (day: number) => {
      // UTC 자정 기준 오늘
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      // 대상 날짜 (UTC 자정)
      const targetDateUTC = new Date(Date.UTC(year, month - 1, day));

      if (targetDateUTC <= todayUTC) {
        showError('오늘 이전 날짜는 수정할 수 없습니다.');
        return;
      }

      setSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
      );
    },
    [year, month],
  );

  // 저장
  const saveSchedule = async () => {
    // 빈 배열도 허용 (해당 월에 근무하지 않는 경우)
    if (selectedDays.length === 0) {
      const confirmed = await showConfirm(
        '이번 달에 근무 가능한 날짜가 없습니다. 저장하시겠습니까?',
      );
      if (confirmed) {
        saveMutation.mutate();
      }
    } else {
      saveMutation.mutate();
    }
  };

  // 새로고침 (서버에서 최신 데이터 가져오기)
  const refresh = () => {
    refetch();
  };

  return {
    availableDates: availableDates || [],
    selectedDays,
    toggleDay,
    saveSchedule,
    refresh,
    loading: saveMutation.isPending,
    fetching,
    error: error?.message || null,
  };
};
