const fs = require('fs');
const path = require('path');

if (!process.env.LEANCLOUD_APP_ID) {
  console.error('没有环境变量！是不是忘记 $(lean env) 了？');
  process.exit(1);
}

const content = `VITE_LC_APP_ID=${process.env.LEANCLOUD_APP_ID}
VITE_LC_APP_KEY=${process.env.LEANCLOUD_APP_KEY}
VITE_LC_API_SERVER=${process.env.LEANCLOUD_API_HOST}
VITE_LC_TICKET_HOST=${process.env.TICKET_HOST}`;

const filePath = path.resolve(__dirname, '../.env.local');
fs.writeFileSync(filePath, content);
