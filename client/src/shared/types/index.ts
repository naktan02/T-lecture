// client/src/shared/types/index.ts
// Barrel file for shared types

export type {
  BaseUser,
  AdminInfo,
  InstructorInfo,
  UserListItem,
  AdminUserResponse,
  AssignedInstructor,
} from './user';

// Unit 관련 타입
export type {
  MilitaryType,
  ScheduleLocation,
  TrainingLocation,
  UnitSchedule,
  TrainingPeriod,
  Unit,
  TrainingLocationUpdatePayload,
  TrainingPeriodUpdatePayload,
  UpdateUnitWithPeriodsPayload,
  CreateTrainingPeriodPayload,
} from './unit.types';

// Unit 헬퍼 함수
export {
  getPeriodDateRange,
  getUnitPeriodsSummary,
  formatDateShort,
  formatTimeShort,
  toDateInputValue,
} from './unit.types';
