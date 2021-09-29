import fs from 'fs';
import path from 'path';
import Router from '@koa/router';

export const router = new Router();

fs.readdirSync(__dirname).forEach((file) => {
  if (file === 'index.js') {
    return;
  }
  const integration = require(path.join(__dirname, file));
  if (!integration?.enabled) {
    return;
  }
  if (integration.router) {
    router.use(integration.router.routes());
  }
});
