// server/tests/load/k6/quick-test.js
// k6 빠른 테스트 - 30초 간단 확인용

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  duration: '30s',
  vus: 10, // 가상 사용자 10명
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Health Check (Auth X)
  let res = http.get(`${BASE_URL}/`);
  check(res, { 'health: status 200': (r) => r.status === 200 });

  // 2. 메타데이터 (Auth X)
  res = http.get(`${BASE_URL}/api/v1/metadata/teams`);
  check(res, { 'teams: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  // 3. 로그인 (Auth Check)
  const loginPayload = JSON.stringify({
    email: 'admin@t-lecture.com',
    password: 'admin',
  });

  res = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  let params = {};
  // 로그인 성공 시 토큰 사용
  if (check(res, { 'login: status 200': (r) => r.status === 200 })) {
    try {
      const body = JSON.parse(res.body);
      params = {
        headers: {
          Authorization: `Bearer ${body.accessToken}`,
          'Content-Type': 'application/json',
        },
      };
    } catch (e) {
      console.log('Login failed parsing');
    }
  }

  // 4. 부대 목록 (Auth Required)
  res = http.get(`${BASE_URL}/api/v1/units?page=1&limit=10`, params);
  check(res, { 'units: status 2xx': (r) => r.status >= 200 && r.status < 400 });

  sleep(0.5);
}
