// client/src/features/unit/model/useUnit.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { UpdateUnitWithPeriodsPayload } from '../../../shared/types/unit.types';
import { useState, Dispatch, SetStateAction } from 'react';
import { showSuccess, showError } from '../../../shared/utils';

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
  deleteUnits: (
    ids: (number | string)[],
    selectAll?: boolean,
    filters?: SearchParams,
  ) => Promise<unknown>;
  registerUnit: (data: UnitData) => Promise<unknown>;
  updateUnit: (params: { id: number | string; data: UpdateUnitWithPeriodsPayload }) => void;
  deleteUnit: (id: number | string) => void;
  uploadExcel: (file: File) => Promise<unknown>;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const useUnit = (searchParams: SearchParams = {}): UseUnitReturn => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['units', page, limit, searchParams, sortField, sortOrder],
    queryFn: () => unitApi.getUnitList({ page, limit, ...searchParams, sortField, sortOrder }),
    // keepPreviousData is deprecated in v5, using placeholderData instead
  });

  // 데이터 접근 안전장치
  const units: Unit[] = Array.isArray(response?.data?.data) ? response.data.data : [];
  const meta: UnitMeta = response?.data?.meta || { total: 0, lastPage: 1 };

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number | string;
      data: UpdateUnitWithPeriodsPayload;
    }) => {
      return unitApi.updateUnit(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unitDetail'] });
      showSuccess('부대 정보가 성공적으로 수정되었습니다.');
    },
    onError: (err) => {
      console.error(err);
      showError('수정 중 오류가 발생했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: unitApi.deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      showSuccess('삭제되었습니다.');
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: unitApi.uploadExcel,
    onSuccess: (res: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      showSuccess(res.message || '업로드가 완료되었습니다.');
    },
    onError: () => showError('업로드 실패'),
  });

  const registerMutation = useMutation({
    mutationFn: unitApi.registerUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      showSuccess('등록되었습니다.');
    },
    onError: (err: Error) => showError(err.message || '등록 실패'),
  });

  const deleteManyMutation = useMutation({
    mutationFn: ({
      ids,
      selectAll,
      filters,
    }: {
      ids: (number | string)[];
      selectAll?: boolean;
      filters?: SearchParams;
    }) => unitApi.deleteUnits(ids, selectAll, filters),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      return res;
    },
    onError: (err: Error) => showError('삭제 중 오류가 발생했습니다: ' + err.message),
  });

  return {
    units,
    meta,
    page,
    setPage,
    isLoading,
    isError,
    // Actions
    deleteUnits: (ids, selectAll, filters) =>
      deleteManyMutation.mutateAsync({ ids, selectAll, filters }),
    registerUnit: registerMutation.mutateAsync,
    updateUnit: updateMutation.mutate,
    deleteUnit: deleteMutation.mutate,
    uploadExcel: uploadExcelMutation.mutateAsync,
    sortField,
    sortOrder,
    onSort: handleSort,
  };
};
