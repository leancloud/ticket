const fs = require('fs');
const path = require('path');

const keys = [
  'LC_APP_ID',
  'LC_APP_KEY',
  'LC_API_SERVER',
  'SENTRY_WEB_DSN',
  'ENABLE_LEANCLOUD_INTEGRATION',
];

function generate() {
  const firstMissingKey = keys.find((key) => !process.env[key]);
  if (firstMissingKey) {
    console.warn(`缺少环境变量 "${firstMissingKey}"，是不是忘记 $(lean env) 了？`);
    return;
  }

  const content = keys.map((key) => `VITE_${key}=${process.env[key]}`).join('\n');
  const filePath = path.resolve(__dirname, '../.env.local');
  fs.writeFileSync(filePath, content);
}

generate();
