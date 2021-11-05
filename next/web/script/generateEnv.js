const fs = require('fs');
const path = require('path');

if (process.env.LEANCLOUD_APP_ID) {
  let content = `VITE_LC_APP_ID=${process.env.LEANCLOUD_APP_ID}
VITE_LC_APP_KEY=${process.env.LEANCLOUD_APP_KEY}
VITE_LC_API_SERVER=${process.env.LEANCLOUD_API_HOST}`;
  content = process.env.VITE_SENTRY_DNS
    ? `${content}
  VITE_SENTRY_DNS=${process.env.VITE_SENTRY_DNS}`
    : content;

  const filePath = path.resolve(__dirname, '../.env.local');
  fs.writeFileSync(filePath, content);
} else {
  console.warn('没有环境变量！是不是忘记 $(lean env) 了？');
}
