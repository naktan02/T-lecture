const assert = require('node:assert/strict');
const { sanitizeAssignmentCreates } = require('../../src/domains/assignment/assignment-input');

describe('sanitizeAssignmentCreates', () => {
  it('normalizes numeric ids before save', () => {
    assert.deepEqual(
      sanitizeAssignmentCreates([
        { unitScheduleId: '696', instructorId: '85', trainingLocationId: '12' },
      ]),
      [{ unitScheduleId: 696, instructorId: 85, trainingLocationId: 12 }],
    );
  });

  it('rejects missing or fallback training locations before Prisma', () => {
    assert.throws(
      () =>
        sanitizeAssignmentCreates([
          { unitScheduleId: 696, instructorId: 85, trainingLocationId: 'default' },
        ]),
      (error) =>
        error.statusCode === 400 &&
        error.code === 'NO_TRAINING_LOCATION' &&
        error.message === '교육장소가 없습니다. 교육장소를 추가해주세요.',
    );
  });

  it('rejects invalid schedule and instructor ids', () => {
    assert.throws(
      () =>
        sanitizeAssignmentCreates([
          { unitScheduleId: 'x', instructorId: 85, trainingLocationId: 1 },
        ]),
      (error) => error.statusCode === 400 && error.code === 'VALIDATION_ERROR',
    );
  });
});
