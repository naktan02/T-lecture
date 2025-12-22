import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitApi } from "../api/unitApi";
import { useState } from 'react';

export const useUnit = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // 페이지당 20개

  const { data: response, isLoading, isError, error } = useQuery({
    // ✅ queryKey에 searchParams 포함 (검색 조건 변경 시 자동 재요청)
    queryKey: ["units", page, limit, searchParams], 
    queryFn: () => unitApi.getUnitList({ 
      page, 
      limit, 
      ...searchParams // ✅ API 호출 시 필터 전달
    }),
    keepPreviousData: true,
  });

  const units = response?.data?.data || [];
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

  return {
    units,
    meta,     // 페이징 정보 노출
    page,     // 현재 페이지
    setPage,  // 페이지 변경 함수
    isLoading,
    isError,
    errorMessage: error?.message,
    updateUnit: updateMutation.mutate,
    deleteUnit: deleteMutation.mutate,
    uploadExcel: uploadExcelMutation.mutateAsync,
    registerUnit: registerMutation.mutateAsync,
  };
};