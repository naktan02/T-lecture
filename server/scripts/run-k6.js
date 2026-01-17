// server/scripts/run-k6.js
// Windows 호환성을 위한 k6 실행 스크립트
// .env 파일을 읽어서 k6 실행 시 환경변수로 주입합니다.

const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// .env 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

// 실행할 스크립트 (기본값: quick-test.js)
const scriptName = process.argv[2] || 'k6/quick-test.js';

// k6 실행 명령 구성
const k6Args = ['run'];

// New Relic 연동인 경우
if (process.argv.includes('--newrelic')) {
  if (!process.env.NEW_RELIC_LICENSE_KEY || !process.env.NEW_RELIC_ACCOUNT_ID) {
    console.error('❌ Error: NEW_RELIC_LICENSE_KEY or NEW_RELIC_ACCOUNT_ID is missing in .env');
    console.error('   Please add them to enable New Relic integration.');
    process.exit(1);
  }

  k6Args.push('--out', 'newrelic');
  console.log('🔌 New Relic integration enabled');
}

k6Args.push(path.join(__dirname, `../tests/load/${scriptName}`));

console.log(`🚀 Running k6 test: ${scriptName}`);

// k6 프로세스 실행
const k6 = spawn('k6', k6Args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // k6가 사용하는 New Relic 환경변수 매핑
    NEW_RELIC_API_KEY: process.env.NEW_RELIC_LICENSE_KEY, // k6는 API_KEY라는 이름을 사용 (License Key 값)
    NEW_RELIC_ACCOUNT_ID: process.env.NEW_RELIC_ACCOUNT_ID,
  },
});

k6.on('close', (code) => {
  process.exit(code);
});
