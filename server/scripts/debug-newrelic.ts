// server/scripts/debug-newrelic.ts
// New Relic 로딩 테스트 스크립트

import dotenv from 'dotenv';
import path from 'path';

// .env 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 New Relic Debug');
console.log('==================');
console.log(
  'NEW_RELIC_LICENSE_KEY:',
  process.env.NEW_RELIC_LICENSE_KEY
    ? `SET (${process.env.NEW_RELIC_LICENSE_KEY.length} chars)`
    : 'NOT SET',
);
console.log('NEW_RELIC_APP_NAME:', process.env.NEW_RELIC_APP_NAME || 'NOT SET');
console.log('');

if (!process.env.NEW_RELIC_LICENSE_KEY) {
  console.error('❌ License key is missing. Please set NEW_RELIC_LICENSE_KEY in .env');
  process.exit(1);
}

console.log('📦 Loading New Relic agent...');
try {
  // New Relic은 반드시 require로 로드해야 함
  const newrelic = require('newrelic');
  console.log('✅ New Relic agent loaded successfully!');
  console.log('   Agent version:', newrelic.agent?.config?.version || 'unknown');

  // 잠시 대기 후 종료 (에이전트 초기화 시간)
  setTimeout(() => {
    console.log('✅ Agent should be connected. Check New Relic dashboard.');
    process.exit(0);
  }, 5000);
} catch (error: any) {
  console.error('❌ Failed to load New Relic agent:');
  console.error('   ', error.message);
  process.exit(1);
}
