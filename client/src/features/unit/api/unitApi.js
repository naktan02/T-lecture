import { apiClient } from "../../../shared/apiClient";

export const unitApi = {
  // 상세 조회
  getUnit: async (id) => {
    const response = await apiClient(`/api/v1/units/${id}`);
    return response.json();
  },

  // 목록 조회
  getUnitList: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient(`/api/v1/units?${queryString}`);
    return response.json();
  },
  
  // 등록
  registerUnit: async (data) => {
    const response = await apiClient("/api/v1/units", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // 엑셀 업로드
  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await apiClient("/api/v1/units/upload/excel", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": undefined }, 
    });
    return response.json();
  },
  
  // 기본 정보 수정
  updateUnitBasic: async (id, data) => {
    const response = await apiClient(`/api/v1/units/${id}/basic`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // 담당자 정보 수정
  updateUnitOfficer: async (id, data) => {
    const response = await apiClient(`/api/v1/units/${id}/officer`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // ✅ [수정] 중복된 deleteUnit 제거하고 하나만 유지
  deleteUnit: async (id) => {
    await apiClient(`/api/v1/units/${id}`, { method: "DELETE" });
  },

  // 다중 삭제
  deleteUnits: async (ids) => {
    const response = await apiClient(`/api/v1/units/batch/delete`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });
    return response.json();
  },
};