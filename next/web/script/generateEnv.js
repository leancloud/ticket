const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_KEYS = ['LC_APP_ID', 'LC_APP_KEY', 'LEANCLOUD_API_HOST'];

const OPTIONAL_ENV_KEYS = [
  'SENTRY_WEB_DSN',
  'ENABLE_LEANCLOUD_INTEGRATION',
  'ALGOLIA_API_KEY',
  'ENABLE_USER_CONFIRMATION',
];

const CUSTOM_ENVS = {
  ENABLE_TAP_SUPPORT: ({ TAP_SUPPORT_AUTH_SECRET }) => {
    if (TAP_SUPPORT_AUTH_SECRET) {
      return '1';
    }
  },
};

function generate() {
  const env = { ...process.env };

  const firstMissingKey = REQUIRED_ENV_KEYS.find((key) => env[key] === undefined);
  if (firstMissingKey) {
    console.error(`缺少环境变量 "${firstMissingKey}"，是不是忘记 $(lean env) 了？`);
    process.exit(1);
  }

  const content = [
    ...REQUIRED_ENV_KEYS.concat(OPTIONAL_ENV_KEYS).map((key) => [key, env[key]]),
    ...Object.entries(CUSTOM_ENVS).map(([key, fn]) => [key, fn(env)]),
  ]
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `VITE_${key}=${value}`)
    .join('\n');

  const filePath = path.resolve(__dirname, '../.env.local');
  fs.writeFileSync(filePath, content);
}

generate();
