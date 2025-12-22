import { apiClient } from "../../../shared/apiClient";

export const unitApi = {
  // ✅ [추가] 부대 상세 정보 조회 (하위 데이터 포함)
  getUnit: async (id) => {
    const response = await apiClient(`/api/v1/units/${id}`);
    return response.json();
  },

  // 1. 목록 조회 (경로 수정: unit -> units)
  getUnitList: async (params = {}) => { // params 추가
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient(`/api/v1/units?${queryString}`);
    return response.json();
  },
  
  // 2. 단건 등록 (경로 수정: unit -> units)
  registerUnit: async (data) => {
    const response = await apiClient("/api/v1/units", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // 3. 엑셀 업로드 (경로 수정 & Content-Type 초기화)
  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await apiClient("/api/v1/units/upload/excel", {
      method: "POST",
      body: formData,
      // 중요: undefined로 설정해야 apiClient의 기본 JSON 헤더를 덮어쓰고 브라우저 자동 설정을 따름
      headers: { "Content-Type": undefined }, 
    });
    return response.json();
  },
  
  // 4. 기본 정보 수정 (경로 수정)
  updateUnitBasic: async (id, data) => {
    const response = await apiClient(`/api/v1/units/${id}/basic`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // 5. 담당자 정보 수정 (경로 수정)
  updateUnitOfficer: async (id, data) => {
    const response = await apiClient(`/api/v1/units/${id}/officer`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // 6. 삭제 (경로 수정)
  deleteUnit: async (id) => {
    await apiClient(`/api/v1/units/${id}`, { method: "DELETE" });
  },

  // 6. 단건 삭제
  deleteUnit: async (id) => {
    await apiClient(`/api/v1/units/${id}`, { method: "DELETE" });
  },

  // ✅ [추가] 다중 삭제
  deleteUnits: async (ids) => {
    const response = await apiClient(`/api/v1/units/batch/delete`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });
    return response.json();
  },
};