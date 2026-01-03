// server/src/types/assignment.types.ts
// Assignment 도메인 중앙화된 타입 정의

import { Prisma } from '@prisma/client';

// Prisma 자동 생성 타입 - DB 스키마와 자동 동기화
export type InstructorWithAvailabilities = Prisma.InstructorGetPayload<{
  include: {
    user: true;
    team: true;
    availabilities: true;
    virtues: {
      include: { virtue: true };
    };
  };
}>;

export type AssignmentWithUser = Prisma.InstructorUnitAssignmentGetPayload<{
  include: {
    User: {
      include: {
        instructor: {
          include: { team: true };
        };
      };
    };
  };
}>;

// DTO 변환용 간소화된 타입 (Prisma 반환과 호환)
export interface TrainingLocationRaw {
  id: number | string;
  originalPlace: string | null;
  changedPlace?: string | null;
  instructorsNumbers?: number | null;
  plannedCount?: number | null;
  actualCount?: number | null;
  note?: string | null;
  hasInstructorLounge?: boolean | null;
  hasWomenRestroom?: boolean | null;
  hasCateredMeals?: boolean | null;
  hasHallLodging?: boolean | null;
  allowsPhoneBeforeAfter?: boolean | null;
}

export interface ScheduleRaw {
  id: number;
  date: Date | null;
  isBlocked?: boolean;
  assignments?: AssignmentRaw[];
}

export interface AssignmentRaw {
  unitScheduleId: number;
  userId: number;
  trainingLocationId?: number | null;
  state: string;
  classification?: string | null; // Temporary, Confirmed
  role?: string | null; // Head, Supervisor, or null
  User: {
    name: string | null;
    instructor?: {
      team?: { name: string | null } | null;
      category?: string | null;
    } | null;
  };
  // 발송 확인용
  dispatchAssignments?: Array<{
    dispatch: { type: string | null } | null;
  }>;
}

export interface UnitRaw {
  id: number;
  name: string | null;
  region: string | null;
  wideArea: string | null;
  addressDetail: string | null;
  officerName: string | null;
  officerPhone: string | null;
  officerEmail: string | null;
  workStartTime: Date | null;
  workEndTime?: Date | null;
  educationStart?: Date | null;
  educationEnd?: Date | null;
  lunchStartTime?: Date | null;
  lunchEndTime?: Date | null;
  trainingLocations: TrainingLocationRaw[];
  schedules: ScheduleRaw[];
}

export interface AvailabilityRaw {
  availableOn: Date;
}

export interface VirtueRaw {
  virtue?: { name: string | null } | null;
}

export interface InstructorRaw {
  userId: number;
  category?: string | null;
  location?: string | null;
  generation?: number | null;
  isTeamLeader?: boolean;
  restrictedArea?: string | null;
  user: {
    name: string | null;
    userphoneNumber?: string | null;
    userEmail?: string | null;
  };
  team?: { name: string | null } | null;
  availabilities: AvailabilityRaw[];
  virtues: VirtueRaw[];
}
