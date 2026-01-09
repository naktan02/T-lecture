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
  // Health Check
  let res = http.get(`${BASE_URL}/`);
  check(res, { 'health: status 200': (r) => r.status === 200 });

  // 메타데이터
  res = http.get(`${BASE_URL}/api/v1/metadata/teams`);
  check(res, { 'teams: status 2xx': (r) => r.status >= 200 && r.status < 300 });

  // 부대 목록
  res = http.get(`${BASE_URL}/api/v1/units?page=1&limit=10`);
  check(res, { 'units: status 2xx': (r) => r.status >= 200 && r.status < 400 });

  sleep(0.5);
}
