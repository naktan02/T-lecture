#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const [, , scriptArg, ...extraArgs] = process.argv;

if (!scriptArg) {
  console.error('Usage: node scripts/run-k6.js <k6-script> [k6 args...]');
  process.exit(1);
}

const scriptPath = path.resolve(process.cwd(), scriptArg);

if (!fs.existsSync(scriptPath)) {
  console.error(`k6 script not found: ${scriptPath}`);
  process.exit(1);
}

const child = spawn('k6', ['run', scriptPath, ...extraArgs], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    K6_BASE_URL: process.env.K6_BASE_URL || 'http://localhost:3000',
  },
});

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error('k6 binary not found. Install k6 first, then rerun the script.');
    console.error('Expected command: k6 run <script>');
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
