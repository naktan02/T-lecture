// client/src/features/auth/authApi.ts
import { apiClient } from '../../shared/apiClient';
import { getDeviceId } from '../../shared/utils';

// 타입 정의
export interface LoginPayload {
  email: string;
  password: string;
  loginType: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    adminLevel?: string;
  };
}

export interface VerificationResponse {
  message: string;
  success?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  type: string;
  virtueIds?: number[];
  teamId?: number;
  category?: string;
}

export interface Virtue {
  id: number;
  name?: string | null;
}

export interface Team {
  id: number;
  name?: string | null;
}

export interface Category {
  id: string;
  label: string;
}

export interface InstructorMetaResponse {
  virtues: Virtue[];
  teams: Team[];
  categories: Category[];
}

// 1. 로그인 (토큰 갱신 로직 불필요 -> skipInterceptor: true)
export async function login({ email, password, loginType }: LoginPayload): Promise<LoginResponse> {
  const deviceId = getDeviceId();
  const res = await apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, loginType, deviceId }),
    skipInterceptor: true,
  });
  return res.json();
}

// 2. 인증번호 발송 (Public)
export async function sendVerificationCode(email: string): Promise<VerificationResponse> {
  const res = await apiClient('/api/v1/auth/code/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipInterceptor: true,
  });
  return res.json();
}

// 3. 인증번호 확인 (Public)
export async function verifyEmailCode(email: string, code: string): Promise<VerificationResponse> {
  const res = await apiClient('/api/v1/auth/code/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
    skipInterceptor: true,
  });
  return res.json();
}

// 4. 회원가입 (Public)
export async function registerUser(payload: RegisterPayload): Promise<VerificationResponse> {
  const res = await apiClient('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipInterceptor: true,
  });
  return res.json();
}

// 5. 메타데이터 조회 (이건 로그인 후 쓸 수도 있으니 토큰 로직 태워도 됨)
export async function getInstructorMeta(): Promise<InstructorMetaResponse> {
  const res = await apiClient('/api/v1/metadata/instructor');
  return res.json();
}

export const logout = async (): Promise<void> => {
  const deviceId = getDeviceId();
  // apiClient가 base URL과 토큰 헤더를 자동으로 처리함
  await apiClient('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
    skipInterceptor: true, // 로그아웃 시 토큰 만료 에러 무시 가능
  });
  // 로컬 스토리지 클리어
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
};
