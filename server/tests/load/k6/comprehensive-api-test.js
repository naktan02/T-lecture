// server/tests/load/k6/comprehensive-api-test.js
// 모든 API 엔드포인트를 커버하는 종합 부하 테스트
// 실행: npm run k6:full

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Rate, Trend } from 'k6/metrics';

// ═══════════════════════════════════════════════════════════════
// 커스텀 메트릭
// ═══════════════════════════════════════════════════════════════
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const apiDuration = new Trend('api_duration');

// ═══════════════════════════════════════════════════════════════
// 테스트 설정
// ═══════════════════════════════════════════════════════════════
export const options = {
  scenarios: {
    // 슈퍼 관리자: 시스템 전체 관리 (적은 수)
    super_admin: {
      executor: 'constant-vus',
      exec: 'superAdminScenario',
      vus: 1,
      duration: '60s',
      startTime: '0s',
    },
    // 일반 관리자: 부대/공지 관리 (중간)
    general_admin: {
      executor: 'constant-vus',
      exec: 'generalAdminScenario',
      vus: 2,
      duration: '60s',
      startTime: '5s',
    },
    // 강사: 일정 확인/응답 (가장 많음)
    instructor: {
      executor: 'ramping-vus',
      exec: 'instructorScenario',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 5 },
        { duration: '15s', target: 0 },
      ],
      startTime: '10s',
    },
    // 공개 API (비인증)
    public_user: {
      executor: 'constant-vus',
      exec: 'publicScenario',
      vus: 3,
      duration: '60s',
      startTime: '0s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95%가 1초 이내
    errors: ['rate<0.05'], // 에러율 5% 미만
    login_duration: ['p(95)<500'], // 로그인은 500ms 이내
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════

function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  loginDuration.add(Date.now() - start);

  const success = check(res, { 'login success': (r) => r.status === 200 });

  // 에러율 정확히 계산 (성공=0, 실패=1)
  errorRate.add(!success ? 1 : 0);

  if (success) {
    const body = JSON.parse(res.body);
    return {
      headers: {
        Authorization: `Bearer ${body.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  console.log(`Login failed for ${email}: ${res.status} ${res.body}`);
  sleep(2);
  return null;
}

function apiCall(method, url, params, checkName, body = null) {
  const start = Date.now();
  let res;

  if (method === 'GET') {
    res = http.get(`${BASE_URL}${url}`, params);
  } else if (method === 'POST') {
    res = http.post(`${BASE_URL}${url}`, body, params);
  } else if (method === 'PUT') {
    res = http.put(`${BASE_URL}${url}`, body, params);
  } else if (method === 'PATCH') {
    res = http.patch(`${BASE_URL}${url}`, body, params);
  }

  apiDuration.add(Date.now() - start);

  const success = check(res, { [checkName]: (r) => r.status >= 200 && r.status < 400 });

  // 에러율 정확히 계산 (성공=0, 실패=1)
  errorRate.add(!success ? 1 : 0);

  return res;
}

// ═══════════════════════════════════════════════════════════════
// 테스트 시작 전 서버 연결 확인 (Warmup)
// ═══════════════════════════════════════════════════════════════
export function setup() {
  // 서버가 준비될 때까지 최대 10초 대기
  for (let i = 0; i < 10; i++) {
    const res = http.get(`${BASE_URL}/`);
    if (res.status === 200) {
      console.log('✅ Server is ready!');
      return;
    }
    console.log(`Waiting for server... (${i + 1}/10)`);
    sleep(1);
  }
  console.log('⚠️ Server might not be fully ready, proceeding anyway...');
}

// ═══════════════════════════════════════════════════════════════
// 시나리오 1: 슈퍼 관리자
// ═══════════════════════════════════════════════════════════════
export function superAdminScenario() {
  const params = login(
    __ENV.SUPER_ADMIN_EMAIL || 'admin@t-lecture.com',
    __ENV.SUPER_ADMIN_PASSWORD || 'admin',
  );
  if (!params) return;

  group('Super Admin - Dashboard', () => {
    apiCall('GET', '/api/v1/dashboard/admin/stats', params, 'admin stats');
    apiCall(
      'GET',
      '/api/v1/dashboard/admin/instructors?startDate=2025-01-01&endDate=2025-12-31',
      params,
      'admin instructors',
    );
    apiCall(
      'GET',
      '/api/v1/dashboard/admin/teams?startDate=2025-01-01&endDate=2025-12-31',
      params,
      'admin teams',
    );
  });

  group('Super Admin - User Management', () => {
    apiCall('GET', '/api/v1/admin/users?page=1&limit=20', params, 'user list');
    apiCall('GET', '/api/v1/admin/users?status=PENDING&page=1&limit=10', params, 'pending users');
  });

  group('Super Admin - System Config', () => {
    apiCall('GET', '/api/v1/metadata/assignment-configs', params, 'assignment configs');
    apiCall('GET', '/api/v1/metadata/templates', params, 'message templates');
    apiCall('GET', '/api/v1/metadata/penalties', params, 'penalties');
    apiCall('GET', '/api/v1/metadata/priority-credits', params, 'priority credits');
  });

  group('Super Admin - Data Backup', () => {
    apiCall('GET', '/api/v1/data-backup/db-size', params, 'db size');
  });

  sleep(1);
}

// ═══════════════════════════════════════════════════════════════
// 시나리오 2: 일반 관리자
// ═══════════════════════════════════════════════════════════════
export function generalAdminScenario() {
  const params = login(
    __ENV.GENERAL_ADMIN_EMAIL || 'general@t-lecture.com',
    __ENV.GENERAL_ADMIN_PASSWORD || 'general',
  );
  if (!params) return;

  group('General Admin - Units', () => {
    apiCall('GET', '/api/v1/units?page=1&limit=20', params, 'units list');
    apiCall('GET', '/api/v1/units?page=1&limit=10&search=테스트', params, 'units search');
  });

  group('General Admin - Notices', () => {
    apiCall('GET', '/api/v1/notices?page=1&limit=20', params, 'notices list');
  });

  group('General Admin - Inquiries', () => {
    apiCall('GET', '/api/v1/inquiries?page=1&limit=20', params, 'inquiries list');
  });

  group('General Admin - Assignments', () => {
    apiCall('GET', '/api/v1/assignments/candidates?unitId=1', params, 'assignment candidates');
  });

  group('General Admin - Dispatches', () => {
    apiCall('GET', '/api/v1/dispatches?page=1&limit=10&type=Temporary', params, 'temp dispatches');
    apiCall(
      'GET',
      '/api/v1/dispatches?page=1&limit=10&type=Confirmed',
      params,
      'confirmed dispatches',
    );
  });

  sleep(1);
}

// ═══════════════════════════════════════════════════════════════
// 시나리오 3: 강사
// ═══════════════════════════════════════════════════════════════
export function instructorScenario() {
  const params = login(
    __ENV.INSTRUCTOR_EMAIL || 'instructor@t-lecture.com',
    __ENV.INSTRUCTOR_PASSWORD || 'instructor',
  );
  if (!params) return;

  group('Instructor - Profile', () => {
    apiCall('GET', '/api/v1/users/me', params, 'my info');
  });

  group('Instructor - Dashboard', () => {
    apiCall('GET', '/api/v1/dashboard/user/stats', params, 'user stats');
    apiCall('GET', '/api/v1/dashboard/user/recent-work?page=1&limit=10', params, 'recent work');
  });

  group('Instructor - Availability', () => {
    apiCall('GET', '/api/v1/instructor/availability', params, 'availability');
    apiCall('GET', '/api/v1/instructor/stats', params, 'instructor stats');
  });

  group('Instructor - Assignments', () => {
    apiCall('GET', '/api/v1/assignments', params, 'my assignments');
    apiCall('GET', '/api/v1/assignments/my', params, 'my assignment list');
    apiCall('GET', '/api/v1/assignments/history?page=1&limit=10', params, 'work history');
  });

  group('Instructor - Dispatches', () => {
    apiCall('GET', '/api/v1/dispatches?page=1&limit=10', params, 'my dispatches');
  });

  group('Instructor - Notices', () => {
    apiCall('GET', '/api/v1/notices?page=1&limit=10', params, 'notices');
  });

  group('Instructor - Inquiries', () => {
    apiCall('GET', '/api/v1/inquiries?page=1&limit=10', params, 'my inquiries');
  });

  sleep(1);
}

// ═══════════════════════════════════════════════════════════════
// 시나리오 4: 공개 API (비인증)
// ═══════════════════════════════════════════════════════════════
export function publicScenario() {
  group('Public - Health Check', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'health: 200': (r) => r.status === 200 });
  });

  group('Public - Metadata', () => {
    let res = http.get(`${BASE_URL}/api/v1/metadata/teams`);
    check(res, { 'teams: 2xx': (r) => r.status >= 200 && r.status < 300 });

    res = http.get(`${BASE_URL}/api/v1/metadata/virtues`);
    check(res, { 'virtues: 2xx': (r) => r.status >= 200 && r.status < 300 });

    res = http.get(`${BASE_URL}/api/v1/metadata/instructor`);
    check(res, { 'instructor meta: 2xx': (r) => r.status >= 200 && r.status < 300 });
  });

  sleep(0.5);
}

// ═══════════════════════════════════════════════════════════════
// 결과 요약
// ═══════════════════════════════════════════════════════════════
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    totalRequests: data.metrics.http_reqs?.values?.count || 0,
    avgResponseTime: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    errorRate: ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2),
    successRate: (100 - (data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2),
  };

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║               📊 종합 부하 테스트 결과                      ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  총 요청 수: ${summary.totalRequests.toString().padEnd(43)}║`);
  console.log(
    `║  평균 응답시간: ${summary.avgResponseTime}ms${' '.repeat(Math.max(0, 38 - summary.avgResponseTime.length))}║`,
  );
  console.log(
    `║  95% 응답시간: ${summary.p95ResponseTime}ms${' '.repeat(Math.max(0, 39 - summary.p95ResponseTime.length))}║`,
  );
  console.log(
    `║  성공률: ${summary.successRate}%${' '.repeat(Math.max(0, 46 - summary.successRate.length))}║`,
  );
  console.log(
    `║  에러율: ${summary.errorRate}%${' '.repeat(Math.max(0, 46 - summary.errorRate.length))}║`,
  );
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  return {
    'reports/k6-comprehensive-result.json': JSON.stringify(data, null, 2),
  };
}
