import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitApi } from "../api/unitApi";
import { useState } from 'react';

export const useUnit = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // 페이지당 20개

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ["units", page, limit, searchParams],
    queryFn: () => unitApi.getUnitList({ page, limit, ...searchParams }),
    keepPreviousData: true, // v5에서는 placeholderData: keepPreviousData 로 변경 권장
  });

  // ✅ 안전한 데이터 접근 (렌더링 에러 방지 1차)
  const units = Array.isArray(response?.data?.data) ? response.data.data : [];
  const meta = response?.data?.meta || { total: 0, lastPage: 1 };

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

  // ✅ [추가] 다중 삭제 Mutation
  const deleteManyMutation = useMutation({
    mutationFn: unitApi.deleteUnits,
    onSuccess: (res) => {
      queryClient.invalidateQueries(["units"]);
      // 성공 메시지는 컴포넌트에서 처리하거나 여기서 alert
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
    // ...
    deleteUnits: deleteManyMutation.mutateAsync, // 비동기 처리를 위해 Async 반환
    registerUnit: useMutation({ mutationFn: unitApi.registerUnit, onSuccess: () => queryClient.invalidateQueries(["units"]) }).mutateAsync,
    updateUnit: useMutation({ mutationFn: ({id, data}) => Promise.all([unitApi.updateUnitBasic(id, data), unitApi.updateUnitOfficer(id, data)]), onSuccess: () => queryClient.invalidateQueries(["units"]) }).mutate,
    deleteUnit: useMutation({ mutationFn: unitApi.deleteUnit, onSuccess: () => queryClient.invalidateQueries(["units"]) }).mutate,
    uploadExcel: useMutation({ mutationFn: unitApi.uploadExcel, onSuccess: () => queryClient.invalidateQueries(["units"]) }).mutateAsync,
  };
};