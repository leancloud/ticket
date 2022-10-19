import fs from 'node:fs';
import path from 'node:path';

fs.readdirSync(__dirname).forEach((filename) => {
  require(path.resolve(__dirname, filename));
});
