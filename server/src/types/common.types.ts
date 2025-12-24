// server/src/types/common.types.ts
// 공통 타입 정의

// Prisma 에러 처리용
export interface PrismaError extends Error {
  code?: string;
}

// 페이징 관련
export interface PagingParams {
  page?: string | number;
  limit?: string | number;
}

export interface PagingResult {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

// API 응답 공통 형식
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
