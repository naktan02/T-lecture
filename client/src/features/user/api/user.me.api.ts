import { apiClient } from '../../../shared/apiClient';

export interface AdminProfile {
  id: number;
  userId: number;
  level: 'GENERAL' | 'SUPER';
}

export interface Virtue {
  id: number;
  name: string;
}

export interface InstructorVirtue {
  virtue: Virtue;
}

export interface InstructorAvailability {
  id: number;
  availableOn: string; // ISO date string
}

export interface InstructorStats {
  legacyPracticumCount: number;
  autoPromotionEnabled: boolean;
}

export interface Team {
  id: number;
  name: string;
}

export interface InstructorProfile {
  userId: number;
  category: string | null; // 'Main' | 'Co' | 'Assistant' | 'Practicum'
  teamId: number | null;
  team?: Team;
  isTeamLeader: boolean;
  location: string | null;
  generation: number | null;
  restrictedArea: string | null;
  lat: number | null;
  lng: number | null;
  hasCar: boolean;
  profileCompleted: boolean;
  virtues?: InstructorVirtue[];
  availabilities?: InstructorAvailability[];
  instructorStats?: InstructorStats[];
}

export interface UserProfile {
  id: number;
  userEmail: string;
  name: string;
  userphoneNumber: string | null;
  status: 'PENDING' | 'APPROVED' | 'RESTING' | 'INACTIVE';
  admin?: AdminProfile;
  instructor?: InstructorProfile;
}

export interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  address?: string; // 강사 활동 지역
  email?: string;
  password?: string;
  restrictedArea?: string; // 강사 제한 지역
  hasCar?: boolean; // 강사 자차 여부
  virtueIds?: number[]; // 강사 가능 덕목 ID 목록
}

// 내 정보 조회
export async function getMyProfile(): Promise<UserProfile> {
  const response = await apiClient('/api/v1/users/me');
  return response.json();
}

// 내 정보 수정
export async function updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const response = await apiClient('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.json();
}
