# k6 Load Test

기본 대상은 `http://localhost:3000` 입니다.

실행:

```bash
cd server
npm run k6:role
```

빠른 확인:

```bash
cd server
npm run k6:quick
```

주요 환경변수:

```env
K6_BASE_URL=http://localhost:3000
K6_ADMIN_VUS=3
K6_LEVELS=30,60,90,120,150
K6_RAMP_SECONDS=30
K6_HOLD_SECONDS=60
K6_COOLDOWN_SECONDS=30
K6_INSTRUCTOR_ACCOUNT_POOL=50
K6_INSTRUCTOR_PASSWORD=test1234
K6_INSTRUCTOR_EMAIL_PATTERN=instructor{padded}@test.com
```

관리자 계정은 아래 우선순위로 사용합니다.

1. `K6_ADMIN_EMAILS`, `K6_ADMIN_PASSWORDS`
2. `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`

주의:

- 현재 시드 코드는 슈퍼관리자만 자동 생성하므로, 추가 관리자 계정을 쓰려면 `K6_ADMIN_EMAILS`로 직접 넘기세요.
- 현재 기본 강사 시드는 50명이라 150 VU 테스트 시 50개 계정을 재사용합니다.
- 150개의 서로 다른 강사 계정으로 테스트하려면 강사 시드를 늘리고 `K6_INSTRUCTOR_ACCOUNT_POOL=150`으로 맞추세요.
