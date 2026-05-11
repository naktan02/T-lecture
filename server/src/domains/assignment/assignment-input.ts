import AppError from '../../common/errors/AppError';

export interface SanitizedAssignmentCreate {
  unitScheduleId: number;
  instructorId: number;
  trainingLocationId: number | null;
}

const MISSING_TRAINING_LOCATION_MESSAGE = '교육장소가 없습니다. 교육장소를 추가해주세요.';

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName}는 양의 정수여야 합니다.`, 400, 'VALIDATION_ERROR');
  }

  return parsed;
}

function parseTrainingLocationId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function sanitizeAssignmentCreates(input: unknown): SanitizedAssignmentCreate[] {
  if (!Array.isArray(input)) {
    throw new AppError('저장할 배정 목록이 필요합니다.', 400, 'VALIDATION_ERROR');
  }

  const assignments = input.map((item) => {
    const assignment = item as {
      unitScheduleId?: unknown;
      instructorId?: unknown;
      trainingLocationId?: unknown;
    };

    return {
      unitScheduleId: parsePositiveInteger(assignment.unitScheduleId, 'unitScheduleId'),
      instructorId: parsePositiveInteger(assignment.instructorId, 'instructorId'),
      trainingLocationId: parseTrainingLocationId(assignment.trainingLocationId),
    };
  });

  if (assignments.some((assignment) => assignment.trainingLocationId === null)) {
    throw new AppError(MISSING_TRAINING_LOCATION_MESSAGE, 400, 'NO_TRAINING_LOCATION');
  }

  return assignments;
}
