import { createRoleBasedSuite } from './common.js';

const suite = createRoleBasedSuite({
  defaultAdminVUs: 1,
  defaultInstructorLevels: [10, 30],
  defaultInstructorAccountPool: 20,
  defaultRampSeconds: 15,
  defaultHoldSeconds: 30,
  defaultCooldownSeconds: 15,
  defaultSleepMinSeconds: 1,
  defaultSleepMaxSeconds: 2,
});

export const options = suite.options;
export const setup = suite.setup;
export const adminFlow = suite.adminFlow;
export const instructorFlow = suite.instructorFlow;
