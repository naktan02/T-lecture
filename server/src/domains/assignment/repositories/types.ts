// server/src/domains/assignment/repositories/types.ts
// 공통 인터페이스 정의

import { Prisma } from '../../../generated/prisma/client.js';

export interface MatchResult {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId?: number | null;
  role?: string | null;
}

export interface BulkCreateSummary {
  requested: number;
  created: number;
  skipped: number;
}

export interface PrismaError extends Error {
  code?: string;
}

export interface BatchUpdateResult {
  added: number;
  removed: number;
  rolesUpdated: number;
  staffLocksUpdated: number;
}

export interface BatchUpdateChanges {
  add: Array<{ unitScheduleId: number; instructorId: number; trainingLocationId: number | null }>;
  remove: Array<{ unitScheduleId: number; instructorId: number }>;
  roleChanges?: Array<{
    unitId: number;
    instructorId: number;
    role: 'Head' | 'Supervisor' | null;
  }>;
  staffLockChanges?: Array<{
    unitId: number;
    isStaffLocked: boolean;
  }>;
}

// 패널티 사유 타입
export interface PenaltyReason {
  unit: string;
  date: string;
  type: string;
}

// 패널티 레코드 with reasons (Prisma Json 필드 확장)
export interface PenaltyWithReasons {
  userId: number;
  count: number;
  expiresAt: Date;
  reasons?: PenaltyReason[];
}

export type { Prisma };
