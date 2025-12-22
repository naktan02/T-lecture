import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitApi } from "../api/unitApi";
import { useState } from 'react';

// ✅ [수정] searchParams를 인자로 받아야 합니다.
export const useUnit = (searchParams = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20); 

  const { data: response, isLoading, isError, error } = useQuery({
    // ✅ 이제 searchParams가 정의되었으므로 에러가 나지 않습니다.
    queryKey: ["units", page, limit, searchParams],
    queryFn: () => unitApi.getUnitList({ page, limit, ...searchParams }),
    keepPreviousData: true, 
  });

  // 데이터 접근 안전장치
  const units = Array.isArray(response?.data?.data) ? response.data.data : [];
  const meta = response?.data?.meta || { total: 0, lastPage: 1 };

  // ... (이하 Mutation 코드는 기존과 동일함) ...
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return Promise.all([
        unitApi.updateUnitBasic(id, data),
        unitApi.updateUnitOfficer(id, data),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["units"]);
      alert("부대 정보가 성공적으로 수정되었습니다.");
    },
    onError: (err) => {
      console.error(err);
      alert("수정 중 오류가 발생했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: unitApi.deleteUnit,
    onSuccess: () => {
        queryClient.invalidateQueries(["units"]);
        alert("삭제되었습니다.");
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: unitApi.uploadExcel,
    onSuccess: (res) => {
        queryClient.invalidateQueries(["units"]);
        alert(res.message || "업로드가 완료되었습니다.");
    },
    onError: () => alert("업로드 실패"),
  });

  const registerMutation = useMutation({
    mutationFn: unitApi.registerUnit,
    onSuccess: () => {
        queryClient.invalidateQueries(["units"]);
        alert("등록되었습니다.");
    },
    onError: (err) => alert(err.message || "등록 실패"),
  });

  const deleteManyMutation = useMutation({
    mutationFn: unitApi.deleteUnits,
    onSuccess: (res) => {
      queryClient.invalidateQueries(["units"]);
      return res; 
    },
    onError: (err) => alert("삭제 중 오류가 발생했습니다: " + err.message),
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