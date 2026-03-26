const assert = require('node:assert/strict');
const { AssignmentEngine } = require('../../src/domains/assignment/engine');

function makeUnit(requiredCounts, dates = ['2026-04-01', '2026-04-02', '2026-04-03']) {
  return [
    {
      id: 1,
      name: '테스트 부대',
      region: '서울',
      wideArea: '서울',
      trainingPeriods: [
        {
          id: 11,
          unitId: 1,
          unitName: '테스트 부대',
          region: '서울',
          wideArea: '서울',
          isStaffLocked: false,
          excludedDates: [],
          locations: [],
          schedules: requiredCounts.map((requiredCount, index) => ({
            id: 101 + index,
            date: new Date(`${dates[index]}T00:00:00.000Z`),
            requiredCount,
          })),
        },
      ],
    },
  ];
}

function makeCandidate(overrides = {}) {
  return {
    userId: overrides.userId ?? 1,
    name: overrides.name ?? `강사_${overrides.userId ?? 1}`,
    category: overrides.category ?? 'Main',
    teamId: overrides.teamId ?? null,
    teamName: overrides.teamName ?? null,
    isTeamLeader: overrides.isTeamLeader ?? false,
    generation: overrides.generation ?? null,
    restrictedArea: overrides.restrictedArea ?? null,
    maxDistanceKm: overrides.maxDistanceKm ?? null,
    location: overrides.location ?? null,
    availableDates:
      overrides.availableDates ?? ['2026-04-01', '2026-04-02', '2026-04-03'],
    priorityCredits: overrides.priorityCredits ?? 0,
    recentRejectionCount: overrides.recentRejectionCount ?? 0,
    recentAssignmentCount: overrides.recentAssignmentCount ?? 0,
    recentConfirmedCompletedCount: overrides.recentConfirmedCompletedCount ?? 0,
    monthlyAvailabilityCount:
      overrides.monthlyAvailabilityCount ??
      (overrides.availableDates ?? ['2026-04-01', '2026-04-02', '2026-04-03']).length,
  };
}

describe('AssignmentEngine', () => {
  it('prioritizes full-period main candidates with priority credits', () => {
    const engine = new AssignmentEngine();
    const units = makeUnit([1, 1, 1]);
    const candidates = [
      makeCandidate({ userId: 2, name: '일반주강사' }),
      makeCandidate({ userId: 1, name: '우선주강사', priorityCredits: 1 }),
    ];

    const result = engine.execute(units, candidates);
    const assignedIds = result.assignments.map((assignment) => assignment.instructorId);

    assert.deepEqual(assignedIds, [1, 1, 1]);
  });

  it('fills each date with a main even when no single main can cover the whole period', () => {
    const engine = new AssignmentEngine();
    const units = makeUnit([1, 1, 1]);
    const candidates = [
      makeCandidate({
        userId: 10,
        name: '이틀주강사',
        availableDates: ['2026-04-01', '2026-04-02'],
      }),
      makeCandidate({
        userId: 20,
        name: '마지막날주강사',
        availableDates: ['2026-04-03'],
      }),
    ];

    const result = engine.execute(units, candidates);
    const bySchedule = Object.fromEntries(
      result.assignments.map((assignment) => [assignment.unitScheduleId, assignment.instructorId]),
    );

    assert.equal(bySchedule[101], 10);
    assert.equal(bySchedule[102], 10);
    assert.equal(bySchedule[103], 20);
  });

  it('prefers fairer main candidates over raw monthly availability when both cover the full period', () => {
    const engine = new AssignmentEngine();
    const units = makeUnit([1, 1, 1]);
    const candidates = [
      makeCandidate({
        userId: 30,
        name: '신청많음',
        availableDates: Array.from({ length: 20 }, (_, index) =>
          `2026-04-${String(index + 1).padStart(2, '0')}`,
        ),
        monthlyAvailabilityCount: 20,
        recentAssignmentCount: 2,
        recentConfirmedCompletedCount: 4,
      }),
      makeCandidate({
        userId: 40,
        name: '공평우선',
        availableDates: [
          '2026-04-01',
          '2026-04-02',
          '2026-04-03',
          '2026-04-10',
          '2026-04-17',
          '2026-04-24',
        ],
        monthlyAvailabilityCount: 6,
        recentAssignmentCount: 0,
        recentConfirmedCompletedCount: 0,
      }),
    ];

    const result = engine.execute(units, candidates);
    const assignedIds = result.assignments.map((assignment) => assignment.instructorId);

    assert.deepEqual(assignedIds, [40, 40, 40]);
  });

  it('keeps assistant distance limits during fill', () => {
    const engine = new AssignmentEngine({ subMaxDistanceKm: 20 });
    const units = makeUnit([2], ['2026-04-01']);
    const candidates = [
      makeCandidate({ userId: 1, name: '주강사' }),
      makeCandidate({ userId: 2, name: '가까운보조', category: 'Assistant' }),
      makeCandidate({ userId: 3, name: '먼보조', category: 'Assistant' }),
    ];

    const result = engine.execute(units, candidates, {
      instructorDistances: new Map([
        ['1-1', 5],
        ['2-1', 10],
        ['3-1', 40],
      ]),
    });

    const assignedIds = result.assignments.map((assignment) => assignment.instructorId).sort();
    assert.deepEqual(assignedIds, [1, 2]);
  });

  it('keeps practicum distance limits during fill', () => {
    const engine = new AssignmentEngine({ internMaxDistanceKm: 20 });
    const units = makeUnit([2], ['2026-04-01']);
    const candidates = [
      makeCandidate({ userId: 1, name: '주강사' }),
      makeCandidate({ userId: 2, name: '가까운실습', category: 'Practicum' }),
      makeCandidate({ userId: 3, name: '먼실습', category: 'Practicum' }),
    ];

    const result = engine.execute(units, candidates, {
      instructorDistances: new Map([
        ['1-1', 5],
        ['2-1', 10],
        ['3-1', 40],
      ]),
    });

    const assignedIds = result.assignments.map((assignment) => assignment.instructorId).sort();
    assert.deepEqual(assignedIds, [1, 2]);
  });
});
