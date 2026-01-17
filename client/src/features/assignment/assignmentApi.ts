// src/features/assignment/assignmentApi.ts
import { apiClient } from '../../shared/apiClient';

// 타입 정의 - 서버 assignment.dto.ts의 응답 형식과 일치
export interface UnitScheduleDetail {
  unitName: string;
  region: string;
  wideArea: string;
  address: string;
  detailAddress: string | null;
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
  trainingPeriodId: number; // 자동 배정용 교육기간 ID
  unitName: string;
  originalPlace: string;
  actualCount: number | null; // 서버에서 계산된 참여인원
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
  actualDateRange?: {
    startDate: string;
    endDate: string;
  };
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
  trainingPeriodIds: number[],
  instructorIds: number[],
): Promise<AutoAssignmentResult> => {
  const res = await apiClient('/api/v1/assignments/auto-assign', {
    method: 'POST',
    body: JSON.stringify({ trainingPeriodIds, instructorIds }),
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
 * 임시 배정 메시지 일괄 발송 (날짜 범위 필터링)
 */
export const sendTemporaryMessagesApi = async (
  startDate: string,
  endDate: string,
): Promise<{ count: number; message: string }> => {
  const params = new URLSearchParams({ startDate, endDate });
  const res = await apiClient(`/api/v1/dispatches/send/temporary?${params}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || '메시지 발송에 실패했습니다.');
  }
  return res.json();
};
// 임시 배정 추가
export const addAssignmentApi = async (
  unitScheduleId: number,
  instructorId: number,
  trainingLocationId: number | null,
) => {
  const res = await apiClient('/api/v1/assignments/bulk-save', {
    method: 'POST',
    body: JSON.stringify({
      assignments: [{ unitScheduleId, instructorId, trainingLocationId }],
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res;
};

/**
 * 부대 인원고정 설정/해제
 */
export const toggleStaffLockApi = async (
  unitId: number,
  isStaffLocked: boolean,
): Promise<{ message: string; result: unknown }> => {
  const res = await apiClient(`/api/v1/assignments/unit/${unitId}/staff-lock`, {
    method: 'PATCH',
    body: JSON.stringify({ isStaffLocked }),
  });
  if (!res.ok) throw new Error('인원고정 설정에 실패했습니다.');
  return res.json();
};

/**
 * 강사 배정 응답 (수락/거절)
 */
export const respondToAssignmentApi = async (
  unitScheduleId: number,
  response: 'ACCEPT' | 'REJECT',
): Promise<{ message: string }> => {
  const res = await apiClient(`/api/v1/assignments/${unitScheduleId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || '응답 처리에 실패했습니다.');
  }
  return res.json();
};

// 내 배정 타입 정의
export interface MyAssignment {
  userId: number;
  unitScheduleId: number;
  trainingLocationId: number | null;
  classification: 'Temporary' | 'Confirmed';
  state: 'Pending' | 'Accepted' | 'Rejected' | 'Canceled';
  role: string | null;
  UnitSchedule: {
    id: number;
    date: string;
    isBlocked: boolean;
    unit: {
      id: number;
      name: string;
      region: string;
      wideArea: string;
      addressDetail: string | null;
      officerName: string | null;
      officerPhone: string | null;
      educationStart: string | null;
      educationEnd: string | null;
      trainingLocations: Array<{
        id: number;
        originalPlace: string;
        instructorsNumbers: number;
        plannedCount: number | null;
        actualCount: number | null;
      }>;
    };
    assignments: Array<{
      userId: number;
      state: string;
      User: {
        id: number;
        name: string;
        userphoneNumber: string | null;
        instructor: {
          category: string | null;
          team: { name: string } | null;
        } | null;
      };
    }>;
  };
  TrainingLocation: {
    id: number;
    originalPlace: string;
  } | null;
}

export interface MyAssignmentsResponse {
  temporary: MyAssignment[];
  confirmed: MyAssignment[];
  total: number;
}

/**
 * 내 배정 목록 조회 (메시지함용)
 */
export const getMyAssignmentsApi = async (): Promise<MyAssignmentsResponse> => {
  const res = await apiClient('/api/v1/assignments/my');
  if (!res.ok) {
    throw new Error('내 배정 목록을 불러오는데 실패했습니다.');
  }
  return res.json();
};

/**
 * 일괄 배정 업데이트용 변경 세트 타입
 */
export interface AssignmentChangeSet {
  add: Array<{ unitScheduleId: number; instructorId: number; trainingLocationId: number | null }>;
  remove: Array<{ unitScheduleId: number; instructorId: number }>;
  roleChanges: Array<{ unitId: number; instructorId: number; role: 'Head' | 'Supervisor' | null }>;
  staffLockChanges: Array<{ unitId: number; isStaffLocked: boolean }>;
}

export interface BatchUpdateResult {
  message: string;
  added: number;
  removed: number;
  rolesUpdated: number;
  staffLocksUpdated: number;
}

/**
 * 일괄 배정 업데이트 (모달 저장)
 */
export const batchUpdateAssignmentsApi = async (
  changes: AssignmentChangeSet,
): Promise<BatchUpdateResult> => {
  const res = await apiClient('/api/v1/assignments/batch-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || '일괄 저장에 실패했습니다.');
  }
  return res.json();
};
