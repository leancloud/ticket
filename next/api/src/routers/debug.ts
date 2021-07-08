import Router from '@koa/router';

import { parse } from '../utils/search';

const router = new Router({
  prefix: '/debug',
});

router.get('/search', (ctx) => {
  ctx.body = parse((ctx.request.query['q'] || '') as string);
});

export default router;
