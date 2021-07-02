import Router from '@koa/router';

import auth from '../middlewares/auth';

const router = new Router();

router.get('/api/2/whoami', auth, async (ctx) => {
  ctx.body = ctx.state.user;
});

export default router;
