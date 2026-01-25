// server/tests/load/k6/concurrent-70-test.js
// 70명 동시 접속 테스트 (관리자 1명 + 강사 69명)

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const apiDuration = new Trend('api_duration');

// 환경 설정
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 계정 정보 (일반 관리자 사용 - 슈퍼 관리자는 대시보드 권한 없음)
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'general@t-lecture.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'general';
const INSTRUCTOR_PASSWORD = 'test1234';

// 테스트 설정
export const options = {
  scenarios: {
    // 관리자 시나리오 (1명, 지속적으로 관리 작업)
    admin: {
      executor: 'constant-vus',
      exec: 'adminScenario',
      vus: 1,
      duration: '2m',
      startTime: '0s',
    },
    // 강사 시나리오 (69명, 점진적 증가)
    instructors: {
      executor: 'ramping-vus',
      exec: 'instructorScenario',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 30 },  // 20초 동안 30명까지 증가
        { duration: '20s', target: 69 },  // 20초 동안 69명까지 증가
        { duration: '60s', target: 69 },  // 60초 동안 69명 유지
        { duration: '20s', target: 0 },   // 20초 동안 종료
      ],
      startTime: '5s', // 관리자 로그인 후 시작
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // p95 < 1초, p99 < 2초
    errors: ['rate<0.05'], // 오류율 5% 미만
    http_req_failed: ['rate<0.05'],
  },
};

// 로그인 헬퍼 함수
function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const startTime = Date.now();

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  loginDuration.add(Date.now() - startTime);

  if (check(res, { 'login success': (r) => r.status === 200 })) {
    try {
      const body = JSON.parse(res.body);
      return {
        headers: {
          Authorization: `Bearer ${body.accessToken}`,
          'Content-Type': 'application/json',
        },
      };
    } catch (e) {
      console.log(`Login parse error for ${email}`);
      errorRate.add(1);
      return null;
    }
  }

  console.log(`Login failed for ${email}: ${res.status}`);
  errorRate.add(1);
  return null;
}

// API 호출 헬퍼
function apiCall(method, url, params, checkName) {
  const startTime = Date.now();
  let res;

  if (method === 'GET') {
    res = http.get(`${BASE_URL}${url}`, params);
  } else if (method === 'POST') {
    res = http.post(`${BASE_URL}${url}`, null, params);
  }

  apiDuration.add(Date.now() - startTime);

  const success = check(res, { [checkName]: (r) => r.status >= 200 && r.status < 400 });
  if (!success) {
    errorRate.add(1);
  }

  return res;
}

// 관리자 시나리오 (1명)
export function adminScenario() {
  group('Admin Login', () => {
    const params = login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!params) {
      sleep(5);
      return;
    }

    // 관리자 작업 반복
    for (let i = 0; i < 5; i++) {
      group('Admin Dashboard', () => {
        // 대시보드 통계
        apiCall('GET', '/api/v1/dashboard/admin/stats', params, 'admin stats');
        sleep(0.5);

        // 부대 목록 조회 (status 파라미터 필수)
        apiCall('GET', '/api/v1/dashboard/admin/units?status=scheduled', params, 'admin units');
        sleep(0.5);

        // 강사 목록 조회
        apiCall('GET', '/api/v1/dashboard/admin/instructors', params, 'admin instructors');
        sleep(0.5);

        // 스케줄 조회 (status: completed, inProgress, scheduled, unassigned)
        apiCall('GET', '/api/v1/dashboard/admin/schedules?status=scheduled', params, 'admin schedules');
        sleep(0.5);

        // 팀 목록 조회
        apiCall('GET', '/api/v1/dashboard/admin/teams', params, 'admin teams');
        sleep(1);
      });

      group('Admin Unit Management', () => {
        // 부대 상세 정보 (랜덤 부대 ID)
        const unitId = Math.floor(Math.random() * 100) + 1;
        apiCall('GET', `/api/v1/dashboard/admin/units/${unitId}`, params, 'unit detail');
        sleep(0.5);
      });

      group('Admin Notices & Inquiries', () => {
        // 공지사항 목록 조회
        apiCall('GET', '/api/v1/notices', params, 'notices list');
        sleep(0.3);

        // 공지사항 상세 조회 (랜덤 ID)
        const noticeId = Math.floor(Math.random() * 10) + 1;
        apiCall('GET', `/api/v1/notices/${noticeId}`, params, 'notice detail');
        sleep(0.3);

        // 문의사항 목록 조회 (관리자는 전체 조회)
        apiCall('GET', '/api/v1/inquiries', params, 'inquiries list');
        sleep(0.3);

        // 문의사항 상세 조회 (랜덤 ID)
        const inquiryId = Math.floor(Math.random() * 10) + 1;
        apiCall('GET', `/api/v1/inquiries/${inquiryId}`, params, 'inquiry detail');
        sleep(0.3);
      });

      sleep(2); // 다음 반복 전 대기
    }
  });
}

// 강사 시나리오 (69명)
export function instructorScenario() {
  // VU 번호에 따라 강사 계정 할당 (1-50 순환)
  const vuId = __VU;
  const instructorNum = ((vuId - 1) % 50) + 1;
  const instructorEmail = `instructor${String(instructorNum).padStart(3, '0')}@test.com`;

  group('Instructor Login', () => {
    const params = login(instructorEmail, INSTRUCTOR_PASSWORD);
    if (!params) {
      sleep(5);
      return;
    }

    // 강사 작업 반복
    for (let i = 0; i < 3; i++) {
      group('Instructor Profile', () => {
        // 내 정보 조회
        apiCall('GET', '/api/v1/users/me', params, 'my info');
        sleep(0.3);

        // 메타데이터 조회
        apiCall('GET', '/api/v1/metadata/instructor', params, 'instructor meta');
        sleep(0.3);
      });

      group('Instructor Assignments', () => {
        // 내 배정 조회
        apiCall('GET', '/api/v1/assignments/my', params, 'my assignments');
        sleep(0.5);
      });

      group('Instructor Schedule', () => {
        // 가용일정 조회 (year, month 파라미터 필수)
        apiCall('GET', '/api/v1/instructor/availability?year=2026&month=1', params, 'availability');
        sleep(0.5);

        // 내 통계 조회
        apiCall('GET', '/api/v1/instructor/stats', params, 'my stats');
        sleep(0.5);
      });

      group('General Data', () => {
        // 팀 목록 (공개)
        apiCall('GET', '/api/v1/metadata/teams', params, 'teams');
        sleep(0.3);

        // 덕목 목록 (공개)
        apiCall('GET', '/api/v1/metadata/virtues', params, 'virtues');
        sleep(0.3);
      });

      group('Notices & Inquiries', () => {
        // 공지사항 목록 조회
        apiCall('GET', '/api/v1/notices', params, 'notices list');
        sleep(0.3);

        // 공지사항 상세 조회 (랜덤 ID)
        const noticeId = Math.floor(Math.random() * 10) + 1;
        apiCall('GET', `/api/v1/notices/${noticeId}`, params, 'notice detail');
        sleep(0.3);

        // 문의사항 목록 조회 (본인 문의만 조회)
        apiCall('GET', '/api/v1/inquiries', params, 'my inquiries');
        sleep(0.3);
      });

      sleep(1); // 다음 반복 전 대기
    }
  });
}

// 기본 함수 (시나리오 없이 실행 시)
export default function () {
  console.log('Use scenarios: admin or instructors');
}
