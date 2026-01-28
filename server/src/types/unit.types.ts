// server/src/types/unit.types.ts
// Unit 도메인 중앙화된 타입 정의

import { Prisma } from '../generated/prisma/client.js';

// Prisma 자동 생성 타입 - DB 스키마와 자동 동기화 (새 구조)
export type UnitWithRelations = Prisma.UnitGetPayload<{
  include: {
    trainingPeriods: {
      include: {
        locations: true;
        schedules: true;
      };
    };
  };
}>;

export type UnitWithFullRelations = Prisma.UnitGetPayload<{
  include: {
    trainingPeriods: {
      include: {
        locations: {
          include: {
            scheduleLocations: true;
          };
        };
        schedules: {
          include: {
            scheduleLocations: true;
            assignments: {
              include: {
                User: {
                  include: {
                    instructor: {
                      include: { team: true };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export type TrainingPeriod = Prisma.TrainingPeriodGetPayload<object>;
export type TrainingLocation = Prisma.TrainingLocationGetPayload<object>;
export type UnitSchedule = Prisma.UnitScheduleGetPayload<object>;
export type ScheduleLocation = Prisma.ScheduleLocationGetPayload<object>;

// 스케줄 및 배정 포함
export type ScheduleWithAssignments = Prisma.UnitScheduleGetPayload<{
  include: {
    scheduleLocations: true;
    assignments: {
      include: {
        User: {
          include: {
            instructor: {
              include: { team: true };
            };
          };
        };
      };
    };
  };
}>;

// TrainingPeriod 포함 전체
export type TrainingPeriodWithFull = Prisma.TrainingPeriodGetPayload<{
  include: {
    unit: true;
    locations: {
      include: {
        scheduleLocations: true;
      };
    };
    schedules: {
      include: {
        scheduleLocations: true;
        assignments: true;
      };
    };
  };
}>;

// DTO/Service 입력 타입
export interface TrainingLocationInput {
  originalPlace?: string;
  changedPlace?: string;
  hasInstructorLounge?: boolean | string;
  hasWomenRestroom?: boolean | string;
  note?: string;
  plannedCount?: number | string | null;
  actualCount?: number | string | null;
}

export interface ScheduleLocationInput {
  date: Date | string;
  locationIndex: number; // 어느 장소에 해당하는지
  plannedCount?: number;
  actualCount?: number;
}

export interface ScheduleLocationUpdateInput {
  unitScheduleId: number;
  trainingLocationId: number;
  plannedCount?: number | null;
  actualCount?: number | null;
}

export interface TrainingPeriodInput {
  name: string; // "정규교육", "추가교육 1차" 등
  workStartTime?: string | Date;
  workEndTime?: string | Date;
  lunchStartTime?: string | Date;
  lunchEndTime?: string | Date;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  excludedDates?: string[];
  // 시설 정보 (TrainingLocation에서 이동됨)
  hasCateredMeals?: boolean | string;
  hasHallLodging?: boolean | string;
  allowsPhoneBeforeAfter?: boolean | string;
  locations?: TrainingLocationInput[];
  scheduleLocations?: ScheduleLocationInput[];
}

export interface RawUnitInput {
  name?: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  addressDetail?: string;
  detailAddress?: string;
  lat?: number;
  lng?: number;
  trainingPeriods?: TrainingPeriodInput[];
  // 기존 호환성용 (단일 교육기간)
  educationStart?: string | Date;
  educationEnd?: string | Date;
  excludedDates?: string[];
  workStartTime?: string | Date;
  workEndTime?: string | Date;
  lunchStartTime?: string | Date;
  lunchEndTime?: string | Date;
  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;
  trainingLocations?: TrainingLocationInput[];
  schedules?: ScheduleInput[];
}

export interface ScheduleInput {
  date: Date | string;
}

export interface UnitQueryInput {
  page?: string | number;
  limit?: string | number;
  keyword?: string;
  region?: string;
  wideArea?: string;
  unitType?: string;
  startDate?: string;
  endDate?: string;
  minPersonnel?: string | number;
  maxPersonnel?: string | number;
  hasError?: string | boolean;
}

// Excel 파일 동적 데이터
export interface ExcelRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ===== Repository/Service 공통 타입 =====

/**
 * 교육장소 데이터 (Repository 입출력용)
 * - 생성/수정 시 사용
 * - TrainingLocationInput보다 더 많은 필드 포함
 */
export interface TrainingLocationData {
  id?: number;
  originalPlace?: string | null;
  changedPlace?: string | null;
  plannedCount?: number | string | null;
  actualCount?: number | string | null;
  hasInstructorLounge?: boolean | string;
  hasWomenRestroom?: boolean | string;
  note?: string | null;
}

/**
 * 일정 데이터 (Repository 입출력용)
 */
export interface ScheduleData {
  date: Date | string;
}

/**
 * Repository 필터 파라미터
 */
export interface UnitFilterParams {
  skip: number;
  take: number;
  where: Prisma.UnitWhereInput;
  orderBy?: Prisma.UnitOrderByWithRelationInput;
}

// ===== updateUnitWithPeriods API 타입 =====

/**
 * TrainingPeriod 업데이트 입력 (locations, schedules 포함)
 */
export interface TrainingPeriodUpdateInput {
  id?: number; // 기존 period면 id 있음, 신규면 undefined
  name: string;
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;
  hasCateredMeals?: boolean;
  hasHallLodging?: boolean;
  allowsPhoneBeforeAfter?: boolean;
  locations?: TrainingLocationUpdateInput[];
  schedules?: ScheduleInput[]; // 신규 period일 때만 사용
}

/**
 * TrainingLocation 업데이트 입력
 */
export interface TrainingLocationUpdateInput {
  id?: number;
  originalPlace?: string;
  changedPlace?: string | null;
  hasInstructorLounge?: boolean;
  hasWomenRestroom?: boolean;
  note?: string | null;
}

/**
 * 부대 기본정보 업데이트 입력
 * - 일정/교육기간/주소는 별도 API로 처리
 */
export interface UpdateUnitWithPeriodsInput {
  // Unit 기본정보
  name?: string;
  unitType?: string;
  wideArea?: string;
  region?: string;
  detailAddress?: string;
  // TrainingPeriods 배열 (선택적 - 기존 호환용)
  trainingPeriods?: TrainingPeriodUpdateInput[];
}

export interface UpdateTrainingPeriodScheduleLocationsInput {
  // 장소 목록 (새 장소 추가/기존 장소 업데이트)
  locations?: Array<{
    id?: number;
    originalPlace: string;
    changedPlace?: string | null;
    hasInstructorLounge?: boolean;
    hasWomenRestroom?: boolean;
    note?: string | null;
  }>;
  // 일정별 장소 매칭 (locationName으로 매칭 가능)
  scheduleLocations: Array<{
    unitScheduleId: number;
    trainingLocationId?: number;
    locationName?: string; // id가 없을 경우 이름으로 매칭
    plannedCount?: number | null;
    actualCount?: number | null;
    requiredCount?: number | null;
  }>;
}

// ===== TrainingPeriod 생성 =====

export interface CreateTrainingPeriodInput {
  name: string;
  workStartTime?: string | null;
  workEndTime?: string | null;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
  officerName?: string | null;
  officerPhone?: string | null;
  officerEmail?: string | null;
  hasCateredMeals?: boolean;
  hasHallLodging?: boolean;
  allowsPhoneBeforeAfter?: boolean;
  startDate?: string;
  endDate?: string;
  excludedDates?: string[];
  // 최초계획 (보고서용) - 선택적
  initialPlannedCount?: number | null;
  locations?: Array<{
    originalPlace?: string;
    changedPlace?: string | null;
    hasInstructorLounge?: boolean;
    hasWomenRestroom?: boolean;
    note?: string | null;
    plannedCount?: number | null;
  }>;
}
