// server/src/types/user.types.ts
// User 도메인 중앙화된 타입 정의

import { Prisma, UserStatus } from '@prisma/client';

// Prisma 자동 생성 타입
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    instructor: {
      include: { team: true };
    };
    admin: true;
  };
}>;

export type InstructorWithTeam = Prisma.InstructorGetPayload<{
  include: { team: true; user: true };
}>;

// Query/Filter 타입
export interface UserQueryFilters {
  status?: string;
  name?: string;
  role?: string;
}

export interface UserRepoFilters {
  status?: UserStatus;
  name?: string;
  role?: string;
}

export interface UserFilters {
  status?: UserStatus;
  name?: { contains: string };
}

// DTO 타입
export interface UpdateUserDto {
  name?: string;
  phoneNumber?: string;
  status?: UserStatus;
  teamId?: number;
  category?: string;
  isTeamLeader?: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  phoneNumber?: string;
  address?: string;
  category?: string;
}
