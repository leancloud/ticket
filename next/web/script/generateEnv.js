const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_KEYS = ['LC_APP_ID', 'LC_APP_KEY', 'LC_API_SERVER'];

const OPTIONAL_ENV_KEYS = ['SENTRY_WEB_DSN', 'ENABLE_LEANCLOUD_INTEGRATION'];

function generate() {
  const firstMissingKey = REQUIRED_ENV_KEYS.find((key) => process.env[key] === undefined);
  if (firstMissingKey) {
    console.error(`缺少环境变量 "${firstMissingKey}"，是不是忘记 $(lean env) 了？`);
    process.exit(1);
  }

  const content = REQUIRED_ENV_KEYS.concat(OPTIONAL_ENV_KEYS)
    .map((key) => {
      const value = process.env[key];
      if (value !== undefined) {
        return `VITE_${key}=${value}`;
      }
    })
    .filter((str) => str !== undefined)
    .join('\n');

  const filePath = path.resolve(__dirname, '../.env.local');
  fs.writeFileSync(filePath, content);
}

generate();
