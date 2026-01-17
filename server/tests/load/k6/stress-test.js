// server/tests/load/k6/stress-test.js
// k6 스트레스 테스트 - 시스템 한계 확인용

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // 10명 시작
    { duration: '30s', target: 50 }, // 50명으로 증가
    { duration: '30s', target: 100 }, // 100명 (스트레스)
    { duration: '30s', target: 200 }, // 200명 (극한)
    { duration: '30s', target: 0 }, // 쿨다운
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 스트레스 시 2초까지 허용
    errors: ['rate<0.3'], // 에러율 30% 미만
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const requests = [
    { url: `${BASE_URL}/`, name: 'Health' },
    { url: `${BASE_URL}/api/v1/metadata/teams`, name: 'Teams' },
    { url: `${BASE_URL}/api/v1/units?page=1&limit=20`, name: 'Units' },
    { url: `${BASE_URL}/api/v1/notices?page=1&limit=10`, name: 'Notices' },
  ];

  for (const req of requests) {
    const res = http.get(req.url);
    const success = check(res, {
      [`${req.name}: status 2xx`]: (r) => r.status >= 200 && r.status < 400,
    });
    errorRate.add(!success);
  }

  sleep(0.3);
}

export function handleSummary(data) {
  return {
    'reports/k6-stress-result.json': JSON.stringify(data, null, 2),
  };
}
