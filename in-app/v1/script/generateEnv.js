const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ENV_KEYS = ['LEANCLOUD_APP_ID', 'LEANCLOUD_APP_KEY', 'LEANCLOUD_API_HOST'];

const OPTIONAL_ENV_KEYS = [
  'ALLOW_MUTATE_EVALUATION',
  'LC_TICKET_HOST',
  'SENTRY_WEB_DSN',
  'VITE_POLYFILL_SERVICE',
];

const CUSTOM_ENVS = {};

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

  const filePath = path.resolve(__dirname, '..', '.env.local');
  fs.writeFileSync(filePath, content);
}

generate();
