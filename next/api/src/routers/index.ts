import Router from '@koa/router';

import auth from '../middlewares/auth';
import debug from './debug';

const router = new Router({
  prefix: '/api/2',
});

router.get('whoami', auth, async (ctx) => {
  ctx.body = ctx.state.user;
});

router.use(debug.routes(), debug.allowedMethods());

export default router;
