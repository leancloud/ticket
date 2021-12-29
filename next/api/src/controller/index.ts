import fs from 'fs';
import path from 'path';

fs.readdirSync(__dirname).forEach((filename) => {
  require(path.resolve(__dirname, filename));
});
