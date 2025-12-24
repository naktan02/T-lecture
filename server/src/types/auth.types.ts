// server/src/types/auth.types.ts
// Auth 도메인 중앙화된 타입 정의

import { UserCategory } from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  address?: string;
  type?: string;
  virtueIds?: number[];
  teamId?: number;
  category?: UserCategory;
}

export interface JwtPayload {
  userId: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string | null;
    name: string | null;
    status: string;
    isAdmin: boolean;
    adminLevel: string | null;
    isInstructor: boolean;
  };
}
