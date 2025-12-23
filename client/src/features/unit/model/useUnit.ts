// client/src/features/unit/model/useUnit.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { useState, Dispatch, SetStateAction } from 'react';

interface SearchParams {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

interface UnitMeta {
  total: number;
  lastPage: number;
  page?: number;
  limit?: number;
}

interface Unit {
  id: number;
  name: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  [key: string]: unknown;
}

interface UseUnitReturn {
  units: Unit[];
  meta: UnitMeta;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  isLoading: boolean;
  isError: boolean;
  deleteUnits: (ids: (number | string)[]) => Promise<unknown>;
  registerUnit: (data: UnitData) => Promise<unknown>;
  updateUnit: (params: { id: number | string; data: unknown }) => void;
  deleteUnit: (id: number | string) => void;
  uploadExcel: (file: File) => Promise<unknown>;
}

export const useUnit = (searchParams: SearchParams = {}): UseUnitReturn => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['units', page, limit, searchParams],
    queryFn: () => unitApi.getUnitList({ page, limit, ...searchParams }),
    // keepPreviousData is deprecated in v5, using placeholderData instead
  });

  // 데이터 접근 안전장치
  const units: Unit[] = Array.isArray(response?.data?.data) ? response.data.data : [];
  const meta: UnitMeta = response?.data?.meta || { total: 0, lastPage: 1 };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: unknown }) => {
      return Promise.all([
        unitApi.updateUnitBasic(id, data as Record<string, unknown>),
        unitApi.updateUnitOfficer(id, data as Record<string, unknown>),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      alert('부대 정보가 성공적으로 수정되었습니다.');
    },
    onError: (err) => {
      console.error(err);
      alert('수정 중 오류가 발생했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: unitApi.deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      alert('삭제되었습니다.');
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: unitApi.uploadExcel,
    onSuccess: (res: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      alert(res.message || '업로드가 완료되었습니다.');
    },
    onError: () => alert('업로드 실패'),
  });

  const registerMutation = useMutation({
    mutationFn: unitApi.registerUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      alert('등록되었습니다.');
    },
    onError: (err: Error) => alert(err.message || '등록 실패'),
  });

  const deleteManyMutation = useMutation({
    mutationFn: unitApi.deleteUnits,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      return res;
    },
    onError: (err: Error) => alert('삭제 중 오류가 발생했습니다: ' + err.message),
  });

  return {
    units,
    meta,
    page,
    setPage,
    isLoading,
    isError,
    // Actions
    deleteUnits: deleteManyMutation.mutateAsync,
    registerUnit: registerMutation.mutateAsync,
    updateUnit: updateMutation.mutate,
    deleteUnit: deleteMutation.mutate,
    uploadExcel: uploadExcelMutation.mutateAsync,
  };
};
