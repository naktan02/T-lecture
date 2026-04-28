// src/features/schedule/model/useSchedule.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyAvailability,
  updateAvailabilityBulk,
  getAvailabilityCutoff,
  AvailabilityDate,
  AvailabilityMonthUpdate,
} from '../scheduleApi';
import { showSuccess, showError, showConfirm, showWarning } from '../../../shared/utils';

// Query key 생성 함수
const scheduleQueryKey = (year: number, month: number) => ['schedule', 'availability', year, month];

const monthKey = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

const parseMonthKey = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
};

const daysToAvailabilityDates = (year: number, month: number, days: number[]): AvailabilityDate[] =>
  [...days]
    .sort((a, b) => a - b)
    .map((day) => {
      const year_str = year.toString();
      const month_str = month.toString().padStart(2, '0');
      const day_str = day.toString().padStart(2, '0');
      return {
        date: `${year_str}-${month_str}-${day_str}`,
        isAvailable: true,
      };
    });

export const useSchedule = (year: number, month: number) => {
  const queryClient = useQueryClient();
  const currentMonthKey = monthKey(year, month);
  const [draftByMonth, setDraftByMonth] = useState<Record<string, number[]>>({});
  const [dirtyMonths, setDirtyMonths] = useState<Set<string>>(() => new Set());
  const selectedDays = useMemo(
    () => draftByMonth[currentMonthKey] || [],
    [draftByMonth, currentMonthKey],
  );

  // 강사 근무가능일 수정 잠금 기준일 조회
  const { data: cutoffDate, refetch: refetchCutoff } = useQuery<string | null>({
    queryKey: ['availabilityCutoff'],
    queryFn: getAvailabilityCutoff,
    staleTime: 10 * 60 * 1000, // 10분간 fresh 상태
  });

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

  // availableDates가 변경될 때마다 현재 월 draft 동기화
  useEffect(() => {
    if (dirtyMonths.has(currentMonthKey)) return;

    const days =
      availableDates
        ?.filter((d) => d.isAvailable && d.date.slice(0, 7) === currentMonthKey)
        .map((d) => Number(d.date.slice(8, 10)))
        .filter((day) => Number.isInteger(day))
        .sort((a, b) => a - b) || [];

    setDraftByMonth((prev) => ({
      ...prev,
      [currentMonthKey]: days,
    }));
  }, [availableDates, currentMonthKey, dirtyMonths]);

  // 저장 뮤테이션 (Optimistic Update 적용)
  const saveMutation = useMutation({
    mutationFn: (months: AvailabilityMonthUpdate[]) => updateAvailabilityBulk(months),
    onMutate: async (months) => {
      const previousDataByMonth: Record<string, AvailabilityDate[] | undefined> = {};

      for (const monthUpdate of months) {
        const targetYear = monthUpdate.year;
        const targetMonth = monthUpdate.month;
        const key = monthKey(targetYear, targetMonth);
        const queryKey = scheduleQueryKey(targetYear, targetMonth);
        await queryClient.cancelQueries({ queryKey });

        previousDataByMonth[key] = queryClient.getQueryData<AvailabilityDate[]>(queryKey);
        queryClient.setQueryData(
          queryKey,
          daysToAvailabilityDates(targetYear, targetMonth, monthUpdate.dates),
        );
      }

      return { previousDataByMonth };
    },
    onError: (err, _variables, context) => {
      if (context?.previousDataByMonth) {
        Object.entries(context.previousDataByMonth).forEach(([key, data]) => {
          const { year: targetYear, month: targetMonth } = parseMonthKey(key);
          queryClient.setQueryData(scheduleQueryKey(targetYear, targetMonth), data);
        });
      }
      showError(err.message || '저장 중 오류가 발생했습니다.');
    },
    onSuccess: (_data, savedMonths) => {
      savedMonths.forEach(({ year: savedYear, month: savedMonth }) => {
        queryClient.invalidateQueries({ queryKey: scheduleQueryKey(savedYear, savedMonth) });
      });
      setDirtyMonths(new Set());
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

      // 잠금 기준일 체크
      if (cutoffDate) {
        const cutoffUTC = new Date(cutoffDate + 'T00:00:00Z');
        if (targetDateUTC <= cutoffUTC) {
          showError(`${cutoffDate} 이전 날짜는 관리자가 잠금한 기간입니다.`);
          return;
        }
      }

      setDraftByMonth((prev) => {
        const currentDays = prev[currentMonthKey] || [];
        const nextDays = currentDays.includes(day)
          ? currentDays.filter((d) => d !== day)
          : [...currentDays, day].sort((a, b) => a - b);

        return {
          ...prev,
          [currentMonthKey]: nextDays,
        };
      });
      setDirtyMonths((prev) => new Set(prev).add(currentMonthKey));
    },
    [year, month, cutoffDate, currentMonthKey],
  );

  // 저장
  const saveSchedule = async () => {
    const dirtyMonthKeys = Array.from(dirtyMonths);

    if (dirtyMonthKeys.length === 0) {
      showWarning('변경된 내용이 없습니다.');
      return;
    }

    const months = dirtyMonthKeys.map((key) => {
      const { year: targetYear, month: targetMonth } = parseMonthKey(key);
      return {
        year: targetYear,
        month: targetMonth,
        dates: draftByMonth[key] || [],
      };
    });

    if (months.some((item) => item.dates.length === 0)) {
      const confirmed = await showConfirm(
        '변경된 월 중 근무 가능한 날짜가 없는 월이 있습니다. 저장하시겠습니까?',
      );
      if (confirmed) {
        saveMutation.mutate(months);
      }
    } else {
      saveMutation.mutate(months);
    }
  };

  // 새로고침 (서버에서 최신 데이터 가져오기 - 잠금 기준일포함)
  const refresh = () => {
    setDirtyMonths(new Set());
    setDraftByMonth({});
    refetch();
    refetchCutoff(); // 잠금 기준일도 강제 갱신 (staleTime 무시)
  };

  return {
    availableDates: availableDates || [],
    selectedDays,
    toggleDay,
    saveSchedule,
    refresh,
    dirtyMonthCount: dirtyMonths.size,
    loading: saveMutation.isPending,
    fetching,
    error: error?.message || null,
    cutoffDate: cutoffDate ?? null,
  };
};
