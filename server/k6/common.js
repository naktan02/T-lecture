import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueByEmail(credentials) {
  const seen = new Set();
  return credentials.filter((credential) => {
    if (!credential?.email || !credential?.password) return false;
    if (seen.has(credential.email)) return false;
    seen.add(credential.email);
    return true;
  });
}

function createInstructorEmail(index, pattern) {
  const padded = String(index).padStart(3, '0');
  return pattern.split('{index}').join(String(index)).split('{padded}').join(padded);
}

function resolveBaseUrl() {
  return (__ENV.K6_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function resolveStageLevels(defaultLevels) {
  const levels = parseCsv(__ENV.K6_LEVELS).map((value) => parseNumber(value, NaN));
  const validLevels = levels.filter((value) => Number.isFinite(value) && value > 0);
  return validLevels.length > 0 ? validLevels : defaultLevels;
}

function buildStages(levels, rampSeconds, holdSeconds, cooldownSeconds) {
  const stages = [];

  for (const target of levels) {
    stages.push({ duration: `${rampSeconds}s`, target });
    stages.push({ duration: `${holdSeconds}s`, target });
  }

  stages.push({ duration: `${cooldownSeconds}s`, target: 0 });
  return stages;
}

function totalStageSeconds(stages) {
  return stages.reduce(
    (sum, stage) => sum + parseNumber(String(stage.duration).replace('s', ''), 0),
    0,
  );
}

function authParams(token, role, name) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    tags: {
      role,
      name,
    },
  };
}

function login(baseUrl, credential, role) {
  const response = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({
      email: credential.email,
      password: credential.password,
      loginType: 'k6',
      deviceId: `k6-${role}-${credential.email}`,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        role,
        name: `${role}_login`,
      },
    },
  );

  if (response.status !== 200) {
    throw new Error(
      `[k6 setup] login failed for ${credential.email}: ${response.status} ${response.body || ''}`,
    );
  }

  const data = response.json();
  if (!data?.accessToken) {
    throw new Error(`[k6 setup] accessToken missing for ${credential.email}`);
  }

  return {
    email: credential.email,
    accessToken: data.accessToken,
    user: data.user || null,
  };
}

function buildAdminCredentials() {
  const envEmails = parseCsv(__ENV.K6_ADMIN_EMAILS);
  const envPasswords = parseCsv(__ENV.K6_ADMIN_PASSWORDS);
  const sharedPassword = __ENV.K6_ADMIN_PASSWORD || '';

  const explicit = envEmails.map((email, index) => ({
    email,
    password: envPasswords[index] || sharedPassword,
  }));

  const derived = [
    __ENV.SUPER_ADMIN_EMAIL
      ? { email: __ENV.SUPER_ADMIN_EMAIL, password: __ENV.SUPER_ADMIN_PASSWORD || sharedPassword }
      : null,
  ].filter(Boolean);

  const credentials = uniqueByEmail([...explicit, ...derived]);

  if (credentials.length === 0) {
    throw new Error(
      '[k6 setup] admin credentials are missing. Set SUPER_ADMIN_EMAIL/PASSWORD or K6_ADMIN_EMAILS.',
    );
  }

  return credentials;
}

function buildInstructorCredentials(defaultAccountPool) {
  const envEmails = parseCsv(__ENV.K6_INSTRUCTOR_EMAILS);
  const envPasswords = parseCsv(__ENV.K6_INSTRUCTOR_PASSWORDS);
  const sharedPassword = __ENV.K6_INSTRUCTOR_PASSWORD || 'test1234';

  if (envEmails.length > 0) {
    const explicit = envEmails.map((email, index) => ({
      email,
      password: envPasswords[index] || sharedPassword,
    }));
    return uniqueByEmail(explicit);
  }

  const pattern = __ENV.K6_INSTRUCTOR_EMAIL_PATTERN || 'instructor{padded}@test.com';
  const poolSize = parseNumber(__ENV.K6_INSTRUCTOR_ACCOUNT_POOL, defaultAccountPool);

  const generated = [];
  for (let index = 1; index <= poolSize; index += 1) {
    generated.push({
      email: createInstructorEmail(index, pattern),
      password: sharedPassword,
    });
  }

  return generated;
}

function pickActor(pool) {
  const vuId = exec.vu.idInTest || 1;
  return pool[(vuId - 1) % pool.length];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function runChecks(responses, labels) {
  for (const [key, response] of Object.entries(responses)) {
    if (
      !check(response, {
        [`${labels[key]} returns 200`]: (res) => res.status === 200,
      })
    ) {
      return false;
    }
  }
  return true;
}

function runAdminBatch(baseUrl, token) {
  const pageType = Math.random() < 0.6 ? 'dashboard' : 'teams';

  if (pageType === 'dashboard') {
    const responses = http.batch({
      me: {
        method: 'GET',
        url: `${baseUrl}/api/v1/users/me`,
        params: authParams(token, 'admin', 'admin_me'),
      },
      stats: {
        method: 'GET',
        url: `${baseUrl}/api/v1/dashboard/admin/stats?period=1m`,
        params: authParams(token, 'admin', 'admin_stats'),
      },
      instructors: {
        method: 'GET',
        url: `${baseUrl}/api/v1/dashboard/admin/instructors?period=1m`,
        params: authParams(token, 'admin', 'admin_instructors'),
      },
      notices: {
        method: 'GET',
        url: `${baseUrl}/api/v1/notices?limit=10`,
        params: authParams(token, 'admin', 'admin_notices'),
      },
    });

    runChecks(responses, {
      me: 'admin /users/me',
      stats: 'admin /dashboard/admin/stats',
      instructors: 'admin /dashboard/admin/instructors',
      notices: 'admin /notices',
    });
    return;
  }

  const responses = http.batch({
    me: {
      method: 'GET',
      url: `${baseUrl}/api/v1/users/me`,
      params: authParams(token, 'admin', 'admin_me'),
    },
    teams: {
      method: 'GET',
      url: `${baseUrl}/api/v1/dashboard/admin/teams?period=1m`,
      params: authParams(token, 'admin', 'admin_teams'),
    },
    notices: {
      method: 'GET',
      url: `${baseUrl}/api/v1/notices?limit=10`,
      params: authParams(token, 'admin', 'admin_notices'),
    },
  });

  runChecks(responses, {
    me: 'admin /users/me',
    teams: 'admin /dashboard/admin/teams',
    notices: 'admin /notices',
  });
}

function runInstructorBatch(baseUrl, token) {
  const pageType = Math.random();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  if (pageType < 0.5) {
    const responses = http.batch({
      me: {
        method: 'GET',
        url: `${baseUrl}/api/v1/users/me`,
        params: authParams(token, 'instructor', 'instructor_me'),
      },
      dashboard: {
        method: 'GET',
        url: `${baseUrl}/api/v1/dashboard/user/stats?period=12m`,
        params: authParams(token, 'instructor', 'instructor_dashboard_stats'),
      },
      notices: {
        method: 'GET',
        url: `${baseUrl}/api/v1/notices?limit=10`,
        params: authParams(token, 'instructor', 'instructor_notices'),
      },
      assignments: {
        method: 'GET',
        url: `${baseUrl}/api/v1/assignments/my`,
        params: authParams(token, 'instructor', 'instructor_assignments'),
      },
      stats: {
        method: 'GET',
        url: `${baseUrl}/api/v1/instructor/stats`,
        params: authParams(token, 'instructor', 'instructor_stats'),
      },
      dispatches: {
        method: 'GET',
        url: `${baseUrl}/api/v1/dispatches?limit=10`,
        params: authParams(token, 'instructor', 'instructor_dispatches'),
      },
    });

    runChecks(responses, {
      me: 'instructor /users/me',
      dashboard: 'instructor /dashboard/user/stats',
      notices: 'instructor /notices',
      assignments: 'instructor /assignments/my',
      stats: 'instructor /instructor/stats',
      dispatches: 'instructor /dispatches',
    });
    return;
  }

  const responses = http.batch({
    me: {
      method: 'GET',
      url: `${baseUrl}/api/v1/users/me`,
      params: authParams(token, 'instructor', 'instructor_me'),
    },
    activities: {
      method: 'GET',
      url: `${baseUrl}/api/v1/dashboard/user/activities?page=1&limit=10&period=12m`,
      params: authParams(token, 'instructor', 'instructor_activities'),
    },
    availability: {
      method: 'GET',
      url: `${baseUrl}/api/v1/instructor/availability?year=${year}&month=${month}`,
      params: authParams(token, 'instructor', 'instructor_availability'),
    },
    notices: {
      method: 'GET',
      url: `${baseUrl}/api/v1/notices?limit=10`,
      params: authParams(token, 'instructor', 'instructor_notices'),
    },
  });

  runChecks(responses, {
    me: 'instructor /users/me',
    activities: 'instructor /dashboard/user/activities',
    availability: 'instructor /instructor/availability',
    notices: 'instructor /notices',
  });
}

export function createRoleBasedSuite(profile = {}) {
  const defaultLevels = profile.defaultInstructorLevels || [30, 60, 90, 120, 150];
  const adminVUs = parseNumber(__ENV.K6_ADMIN_VUS, profile.defaultAdminVUs || 3);
  const rampSeconds = parseNumber(__ENV.K6_RAMP_SECONDS, profile.defaultRampSeconds || 30);
  const holdSeconds = parseNumber(__ENV.K6_HOLD_SECONDS, profile.defaultHoldSeconds || 60);
  const cooldownSeconds = parseNumber(
    __ENV.K6_COOLDOWN_SECONDS,
    profile.defaultCooldownSeconds || 30,
  );
  const sleepMinSeconds = parseNumber(
    __ENV.K6_SLEEP_MIN_SECONDS,
    profile.defaultSleepMinSeconds || 1,
  );
  const sleepMaxSeconds = parseNumber(
    __ENV.K6_SLEEP_MAX_SECONDS,
    profile.defaultSleepMaxSeconds || 3,
  );
  const instructorAccountPool = parseNumber(
    __ENV.K6_INSTRUCTOR_ACCOUNT_POOL,
    profile.defaultInstructorAccountPool || 50,
  );
  const levels = resolveStageLevels(defaultLevels);
  const stages = buildStages(levels, rampSeconds, holdSeconds, cooldownSeconds);
  const totalSeconds = totalStageSeconds(stages);

  const options = {
    scenarios: {
      admins: {
        executor: 'constant-vus',
        exec: 'adminFlow',
        vus: adminVUs,
        duration: `${totalSeconds}s`,
        gracefulStop: '10s',
      },
      instructors: {
        executor: 'ramping-vus',
        exec: 'instructorFlow',
        startVUs: 0,
        stages,
        gracefulRampDown: '10s',
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.01'],
      checks: ['rate>0.99'],
      'http_req_duration{scenario:admins}': ['p(95)<2000', 'p(99)<4000'],
      'http_req_duration{scenario:instructors}': ['p(95)<2000', 'p(99)<4000'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  };

  function setup() {
    const baseUrl = resolveBaseUrl();
    const ping = http.get(`${baseUrl}/api/v1/batch/ping`, {
      tags: { name: 'preflight_ping', role: 'setup' },
    });

    if (ping.status !== 200) {
      throw new Error(`[k6 setup] server ping failed: ${ping.status}`);
    }

    const adminCredentials = buildAdminCredentials();
    const instructorCredentials = buildInstructorCredentials(instructorAccountPool);

    const admins = adminCredentials.map((credential) => login(baseUrl, credential, 'admin'));
    const instructors = instructorCredentials.map((credential) =>
      login(baseUrl, credential, 'instructor'),
    );

    return {
      baseUrl,
      admins,
      instructors,
    };
  }

  function adminFlow(data) {
    const actor = pickActor(data.admins);
    runAdminBatch(data.baseUrl, actor.accessToken);
    sleep(randomBetween(sleepMinSeconds, sleepMaxSeconds));
  }

  function instructorFlow(data) {
    const actor = pickActor(data.instructors);
    runInstructorBatch(data.baseUrl, actor.accessToken);
    sleep(randomBetween(sleepMinSeconds, sleepMaxSeconds));
  }

  return {
    options,
    setup,
    adminFlow,
    instructorFlow,
  };
}
