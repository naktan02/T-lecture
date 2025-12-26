// src/features/assignment/assignmentApi.ts
import { apiClient } from '../../shared/apiClient';

// 타입 정의 - 서버 assignment.dto.ts의 응답 형식과 일치
export interface UnitScheduleDetail {
  unitName: string;
  region: string;
  wideArea: string;
  address: string;
  officerName: string | null;
  officerPhone: string | null;
  officerEmail: string | null;
  originalPlace: string;
  changedPlace: string | null;
  instructorsNumbers: number;
  plannedCount: number | null;
  actualCount: number | null;
  note: string | null;
  educationStart: string | null;
  educationEnd: string | null;
  workStartTime: string;
  workEndTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  hasInstructorLounge: boolean;
  hasWomenRestroom: boolean;
  hasCateredMeals: boolean;
  hasHallLodging: boolean;
  allowsPhoneBeforeAfter: boolean;
}

export interface UnitSchedule {
  type: 'UNIT';
  id: string; // "u-${unitId}-s-${scheduleId}-l-${locationId}" 형식
  unitName: string;
  originalPlace: string;
  instructorsNumbers: number;
  date: string;
  time: string;
  location: string;
  detail: UnitScheduleDetail;
}

export interface InstructorDetail {
  teamName: string | null;
  category: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  generation: number | null;
  isTeamLeader: boolean;
  restrictedArea: string | null;
  virtues: string;
  availableDates: string[];
}

export interface Instructor {
  type: 'INSTRUCTOR';
  id: number;
  name: string;
  teamName: string;
  category: string | null;
  location: string;
  availableDates: string[];
  detail: InstructorDetail;
}

export interface AssignmentCandidatesResponse {
  unassignedUnits: UnitSchedule[];
  availableInstructors: Instructor[];
}

export interface AutoAssignmentResult {
  summary: {
    created: number;
    skipped: number;
  };
  data: unknown[];
}

export interface CancelAssignmentResponse {
  message: string;
}

/**
 * 배정 후보 데이터(미배정 부대, 가용 강사) 조회
 * @param startDate - YYYY-MM-DD
 * @param endDate - YYYY-MM-DD
 */
export const getAssignmentCandidates = async (
  startDate: string,
  endDate: string,
): Promise<AssignmentCandidatesResponse> => {
  // 쿼리 파라미터 생성
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const res = await apiClient(`/api/v1/assignments/candidates?${params}`);

  if (!res.ok) {
    throw new Error('배정 후보 데이터를 불러오는데 실패했습니다.');
  }
  return res.json();
  // 반환값 예시: { unassignedUnits: [...], availableInstructors: [...] }
};

export const postAutoAssignment = async (
  startDate: string,
  endDate: string,
): Promise<AutoAssignmentResult> => {
  const res = await apiClient('/api/v1/assignments/auto-assign', {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  });
  if (!res.ok) throw new Error('자동 배정 실행에 실패했습니다.');

  // 서버가 계층형 JSON 구조를 반환해줍니다.
  return res.json();
};

export const cancelAssignmentApi = async (
  unitScheduleId: number,
  instructorId: number,
): Promise<CancelAssignmentResponse> => {
  const res = await apiClient(`/api/v1/assignments/${unitScheduleId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ unitScheduleId, instructorId }),
  });
  if (!res.ok) throw new Error('배정 취소에 실패했습니다.');
  return res.json();
};

/**
 * 자동 배정 미리보기 (저장 안 함)
 */
export interface PreviewAssignment {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId: number | null;
  role: string;
}

export interface PreviewResult {
  previewAssignments: PreviewAssignment[];
  assignedCount: number;
}

export const postAutoAssignmentPreview = async (
  startDate: string,
  endDate: string,
): Promise<PreviewResult> => {
  const res = await apiClient('/api/v1/assignments/preview', {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  });
  if (!res.ok) throw new Error('자동 배정 미리보기 실패');
  return res.json();
};

/**
 * 배정 일괄 저장
 */
export const bulkSaveAssignmentsApi = async (
  assignments: PreviewAssignment[],
): Promise<{ summary: { created: number; skipped: number } }> => {
  const res = await apiClient('/api/v1/assignments/bulk-save', {
    method: 'POST',
    body: JSON.stringify({ assignments }),
  });
  if (!res.ok) throw new Error('배정 저장에 실패했습니다.');
  return res.json();
};

/**
 * 임시 배정 메시지 일괄 발송
 */
export const sendTemporaryMessagesApi = async (): Promise<{ count: number; message: string }> => {
  const res = await apiClient('/api/v1/messages/send/temporary', {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || '메시지 발송에 실패했습니다.');
  }
  return res.json();
};
