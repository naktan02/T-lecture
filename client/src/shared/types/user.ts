// client/src/shared/types/user.ts
// 공통 사용자 관련 타입 정의

/**
 * 기본 사용자 정보 (모든 사용자 공통)
 */
export interface BaseUser {
  id: number;
  name?: string;
  userEmail?: string;
  status: string;
}

/**
 * 관리자 정보
 */
export interface AdminInfo {
  level: string;
}

/**
 * 강사 기본 정보
 */
export interface InstructorInfo {
  category?: string | null;
  teamName?: string | null;
  isTeamLeader?: boolean;
  location?: string | null;
  generation?: number | null;
  restrictedArea?: string | null;
}

/**
 * 사용자 목록 표시용 타입 (UserListSection 등)
 */
export interface UserListItem extends BaseUser {
  instructor?: unknown;
  admin?: AdminInfo | null;
}

/**
 * 관리자 API 응답용 사용자 타입
 */
export interface AdminUserResponse {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  adminLevel?: string;
  createdAt: string;
  instructorMeta?: {
    mainArea: string;
    subArea: string;
    career: number;
    bank: string;
    accountNumber: string;
    hasVehicle: boolean;
  };
}

/**
 * 배정 모달에서 사용되는 강사 정보 (간략)
 */
export interface AssignedInstructor {
  instructorId: number;
  name: string;
  team: string;
}
