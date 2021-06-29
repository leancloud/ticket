const fs = require('fs');
const path = require('path');

const content = `VITE_LC_APP_ID=${process.env.LC_APP_ID}
VITE_LC_APP_KEY=${process.env.LC_APP_KEY}
VITE_LC_API_SERVER=${process.env.LC_API_SERVER}`;

const filePath = path.resolve(__dirname, '../.env.local');
fs.writeFileSync(filePath, content);
