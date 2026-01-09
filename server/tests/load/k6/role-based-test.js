// server/tests/load/k6/role-based-test.js
// 권한별 부하 테스트 (Super Admin, General Admin, Instructor)

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');

// 테스트 설정
// 테스트 설정은 아래 options_with_exec에서 통합 정의

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 로그인 헬퍼 함수
function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (check(res, { 'login success': (r) => r.status === 200 })) {
    const body = JSON.parse(res.body);
    return {
      headers: {
        Authorization: `Bearer ${body.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  // 로그인 실패 시 로그 출력 및 대기 (무한 루프 방지)
  console.log(`Login failed for ${email}: ${res.status} ${res.body}`);
  errorRate.add(1);
  sleep(2); // 실패 시 2초 대기
  return null;
}

export default function () {
  // 시나리오별 분기 처리는 k6가 자동으로 exec.scenario.name 등을 통해 처리하지 않지만,
  // 여기서는 options.scenarios에서 정의한 executor가 이 default 함수를 실행합니다.
  // 실제로는 각 VU가 어떤 시나리오에 속하는지 알기 어렵기 때문에,
  // 보통은 별도 파일로 분리하거나 환경변수로 역할을 주입합니다.
  // 하지만 여기서는 간단히 모든 유저가 자신의 역할을 수행하는 통합 스크립트로 작성하기 위해
  // __VU(가상유저번호) 또는 시나리오 이름을 체크할 수 있는 방법(k6/execution)을 사용합니다.
}

// ⚠️ k6 v0.30+ 부터는 k6/execution 모듈 사용 가능
// 하지만 호환성을 위해 여기서는 단순하게 환경변수나 시나리오별 분리가 아닌
// 단일 시나리오 내에서 랜덤하게 역할을 수행하거나,
// 가장 확실한 방법인 "모든 VU가 로그인 시도 후 역할별 행동"을 수행하도록 합니다.

import exec from 'k6/execution';

export function super_admin_scenario() {
  group('Super Admin Actions', () => {
    // 1. 로그인
    const params = login(
      __ENV.SUPER_ADMIN_EMAIL || 'admin@t-lecture.com',
      __ENV.SUPER_ADMIN_PASSWORD || 'admin',
    );
    if (!params) return;

    // 2. 관리자 대시보드 통계
    let res = http.get(`${BASE_URL}/api/v1/dashboard/admin/stats`, params);
    check(res, { 'stats: 200': (r) => r.status === 200 });

    // 3. 사용자 목록 관리 (슈퍼관리자 권한)
    res = http.get(`${BASE_URL}/api/v1/admin/users?page=1&limit=10`, params);
    check(res, { 'user list: 200': (r) => r.status === 200 });

    sleep(1);
  });
}

export function general_admin_scenario() {
  group('General Admin Actions', () => {
    // 1. 로그인
    const params = login(
      __ENV.GENERAL_ADMIN_EMAIL || 'general@t-lecture.com',
      __ENV.GENERAL_ADMIN_PASSWORD || 'general',
    );
    if (!params) return;

    // 2. 부대 관리
    let res = http.get(`${BASE_URL}/api/v1/units?page=1&limit=20`, params);
    check(res, { 'units: 200': (r) => r.status === 200 });

    // 3. 공지사항 관리
    res = http.get(`${BASE_URL}/api/v1/notices?page=1&limit=10`, params);
    check(res, { 'notices: 200': (r) => r.status === 200 });

    sleep(1);
  });
}

export function instructor_scenario() {
  group('Instructor Actions', () => {
    // 1. 로그인
    const params = login(
      __ENV.INSTRUCTOR_EMAIL || 'instructor@t-lecture.com',
      __ENV.INSTRUCTOR_PASSWORD || 'instructor',
    );
    if (!params) return;

    // 2. 본인 정보 확인
    let res = http.get(`${BASE_URL}/api/v1/users/me`, params);
    check(res, { 'my info: 200': (r) => r.status === 200 });

    // 3. 배정된 강의 확인 (강사 메타데이터)
    res = http.get(`${BASE_URL}/api/v1/metadata/instructor`, params);
    check(res, { 'instructor meta: 200': (r) => r.status === 200 });

    sleep(1);
  });
}

// 시나리오별 실행 함수 매핑 (options.scenarios.exec 속성으로 연결)
// k6 설정의 exec 속성을 사용하려면 options를 수정해야 함
// 하지만 더 쉬운 방법: default 함수에서 분기

// 수정된 options (exec 지정)
export const options_with_exec = {
  scenarios: {
    super_admin: {
      executor: 'per-vu-iterations',
      exec: 'super_admin_scenario', // 특정 함수 실행
      vus: 1,
      iterations: 5,
      startTime: '0s',
    },
    general_admin: {
      executor: 'constant-vus',
      exec: 'general_admin_scenario',
      vus: 2,
      duration: '30s',
      startTime: '5s',
    },
    instructor: {
      executor: 'ramping-vus',
      exec: 'instructor_scenario',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.05'],
  },
};

// 위 options 사용을 위해 export 덮어쓰기
export { options_with_exec as options };
