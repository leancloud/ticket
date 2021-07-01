const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

if (!fs.existsSync(path.resolve(__dirname, '../dist'))) {
  require('./generate_env');
  process.chdir(path.resolve(__dirname, '..'));
  exec('npm run build');
}
