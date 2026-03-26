import { createRoleBasedSuite } from './common.js';

const suite = createRoleBasedSuite({
  defaultAdminVUs: 3,
  defaultInstructorLevels: [60, 120, 180, 240],
  defaultInstructorAccountPool: 50,
  defaultRampSeconds: 20,
  defaultHoldSeconds: 45,
  defaultCooldownSeconds: 30,
  defaultSleepMinSeconds: 0.5,
  defaultSleepMaxSeconds: 1.5,
});

export const options = suite.options;
export const setup = suite.setup;
export const adminFlow = suite.adminFlow;
export const instructorFlow = suite.instructorFlow;
