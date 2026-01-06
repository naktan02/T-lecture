// server/src/types/unit.types.ts
// Unit 도메인 중앙화된 타입 정의

import { Prisma } from '../generated/prisma/client.js';

// Prisma 자동 생성 타입 - DB 스키마와 자동 동기화
export type UnitWithRelations = Prisma.UnitGetPayload<{
  include: {
    trainingLocations: true;
    schedules: true;
  };
}>;

export type UnitWithFullRelations = Prisma.UnitGetPayload<{
  include: {
    trainingLocations: true;
    schedules: {
      include: {
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
}>;

export type TrainingLocation = Prisma.TrainingLocationGetPayload<object>;
export type UnitSchedule = Prisma.UnitScheduleGetPayload<object>;

// 스케줄 및 배정 포함
export type ScheduleWithAssignments = Prisma.UnitScheduleGetPayload<{
  include: {
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

// DTO/Service 입력 타입
export interface TrainingLocationInput {
  originalPlace?: string;
  changedPlace?: string;
  plannedCount?: number | string;
  actualCount?: number | string;
  hasInstructorLounge?: boolean | string;
  hasWomenRestroom?: boolean | string;
  hasCateredMeals?: boolean | string;
  hasHallLodging?: boolean | string;
  allowsPhoneBeforeAfter?: boolean | string;
  note?: string;
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
  educationStart?: string | Date;
  educationEnd?: string | Date;
  // 교육불가 일자 목록 (개별 날짜 배열)
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
  hasAddressError?: string | boolean; // 주소 오류(좌표 미변환) 필터
}

// Excel 파일 동적 데이터 - 다양한 속성 접근 필요
export interface ExcelRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
