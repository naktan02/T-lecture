// server/tests/load/k6/full-api-test.js
// k6 종합 API 부하 테스트 - 모든 API 엔드포인트 테스트

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// 테스트 설정
export const options = {
  stages: [
    { duration: '10s', target: 5 }, // 워밍업: 5명
    { duration: '30s', target: 20 }, // 램프업: 20명
    { duration: '60s', target: 20 }, // 유지: 20명
    { duration: '10s', target: 0 }, // 쿨다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%가 500ms 이내
    errors: ['rate<0.1'], // 에러율 10% 미만
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 인증 토큰 저장 (로그인 후 사용)
let authToken = '';

// 헬퍼 함수: 인증 헤더 생성
function getAuthHeaders() {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken ? `Bearer ${authToken}` : '',
    },
  };
}

// 응답 체크 및 메트릭 기록
function checkResponse(res, name) {
  const success = check(res, {
    [`${name} - status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name} - response time < 500ms`]: (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  responseTime.add(res.timings.duration);

  return success;
}

export default function () {
  // ═══════════════════════════════════════════════════════════════
  // 1. 공개 API 테스트 (인증 불필요)
  // ═══════════════════════════════════════════════════════════════

  group('Public APIs', function () {
    // Health Check
    let res = http.get(`${BASE_URL}/`);
    checkResponse(res, 'Health Check');

    // 메타데이터 API
    res = http.get(`${BASE_URL}/api/v1/metadata/teams`);
    checkResponse(res, 'Get Teams');

    res = http.get(`${BASE_URL}/api/v1/metadata/virtues`);
    checkResponse(res, 'Get Virtues');

    res = http.get(`${BASE_URL}/api/v1/metadata/instructor`);
    checkResponse(res, 'Get Instructor Metadata');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 2. 인증 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Auth APIs', function () {
    // 로그인 (테스트 계정)
    const loginPayload = JSON.stringify({
      email: 'admin@t-lecture.com',
      password: 'admin',
    });

    let res = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        authToken = body.accessToken || '';
      } catch (e) {
        // 쿠키 기반 인증일 수 있음
      }
    }

    checkResponse(res, 'Login');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 3. 부대(Units) API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Units APIs', function () {
    let res = http.get(`${BASE_URL}/api/v1/units?page=1&limit=20`, getAuthHeaders());
    checkResponse(res, 'Get Units List');

    res = http.get(`${BASE_URL}/api/v1/units?page=1&limit=10&search=테스트`, getAuthHeaders());
    checkResponse(res, 'Search Units');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 4. 배치(Dispatches) API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Dispatches APIs', function () {
    let res = http.get(
      `${BASE_URL}/api/v1/dispatches?page=1&limit=10&type=Temporary`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Get Temporary Dispatches');

    res = http.get(
      `${BASE_URL}/api/v1/dispatches?page=1&limit=10&type=Confirmed`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Get Confirmed Dispatches');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 5. 대시보드 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Dashboard APIs', function () {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    let res = http.get(`${BASE_URL}/api/v1/dashboard/admin/stats`, getAuthHeaders());
    checkResponse(res, 'Admin Stats');

    res = http.get(
      `${BASE_URL}/api/v1/dashboard/admin/instructors?startDate=${startDate}&endDate=${endDate}`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Admin Instructors');

    res = http.get(
      `${BASE_URL}/api/v1/dashboard/admin/teams?startDate=${startDate}&endDate=${endDate}`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Admin Teams');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 6. 사용자 관리 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Admin User APIs', function () {
    let res = http.get(
      `${BASE_URL}/api/v1/admin/users?page=1&limit=20&excludeAdmins=true`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Get Users List');

    res = http.get(
      `${BASE_URL}/api/v1/admin/users?status=PENDING&page=1&limit=10`,
      getAuthHeaders(),
    );
    checkResponse(res, 'Get Pending Users');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 7. 공지사항 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Notices APIs', function () {
    let res = http.get(`${BASE_URL}/api/v1/notices?page=1&limit=30`, getAuthHeaders());
    checkResponse(res, 'Get Notices');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 8. 데이터 백업 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Data Backup APIs', function () {
    let res = http.get(`${BASE_URL}/api/v1/data-backup/db-size`, getAuthHeaders());
    checkResponse(res, 'Get DB Size');
  });

  sleep(0.5);

  // ═══════════════════════════════════════════════════════════════
  // 9. 강사 API 테스트
  // ═══════════════════════════════════════════════════════════════

  group('Instructor APIs', function () {
    let res = http.get(`${BASE_URL}/api/v1/instructor`, getAuthHeaders());
    checkResponse(res, 'Get Instructors');
  });

  sleep(1);
}

// 테스트 종료 시 요약 출력
export function handleSummary(data) {
  console.log('\n========== 테스트 결과 요약 ==========');
  console.log(`총 요청 수: ${data.metrics.http_reqs.values.count}`);
  console.log(`평균 응답시간: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`95% 응답시간: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
  console.log(`에러율: ${(data.metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%`);
  console.log('=====================================\n');

  return {
    'reports/k6-full-api-result.json': JSON.stringify(data, null, 2),
  };
}
