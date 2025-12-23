// client/src/shared/constants/roles.ts

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  GENERAL: 'GENERAL', // UI용 (로그인 탭)
  USER: 'USER', // DB용
  INSTRUCTOR: 'INSTRUCTOR',
} as const;

export const ADMIN_LEVELS = {
  SUPER: 'SUPER',
  GENERAL: 'GENERAL',
} as const;

export const USER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// 타입 추출
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type AdminLevel = (typeof ADMIN_LEVELS)[keyof typeof ADMIN_LEVELS];
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
