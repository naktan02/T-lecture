import { createRoleBasedSuite } from './common.js';

const suite = createRoleBasedSuite({
  defaultAdminVUs: 3,
  defaultInstructorLevels: [30, 60, 90, 120, 150],
  defaultInstructorAccountPool: 50,
  defaultRampSeconds: 30,
  defaultHoldSeconds: 60,
  defaultCooldownSeconds: 30,
  defaultSleepMinSeconds: 1,
  defaultSleepMaxSeconds: 3,
});

export const options = suite.options;
export const setup = suite.setup;
export const adminFlow = suite.adminFlow;
export const instructorFlow = suite.instructorFlow;
