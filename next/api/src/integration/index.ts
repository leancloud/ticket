import fs from 'fs';
import path from 'path';
import Router from '@koa/router';

export const router = new Router();

export interface Integration {
  router?: Router;
}

export function install(name: string, integration: Integration) {
  if (integration.router) {
    router.use(integration.router.routes());
  }
  console.log(`[Integration/${name}] Enabled`);
}

fs.readdirSync(__dirname).forEach((file) => {
  if (file === 'index.js') {
    return;
  }
  const integration = require(path.join(__dirname, file));
  integration.default(install);
});
