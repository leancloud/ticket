import fs from 'node:fs';
import path from 'node:path';

import '../ticket-form-note/ticket-form-note.controller';

fs.readdirSync(__dirname).forEach((filename) => {
  require(path.resolve(__dirname, filename));
});
