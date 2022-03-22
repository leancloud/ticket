import Router from '@koa/router';
import _ from 'lodash';
import { auth, customerServiceOnly } from '@/middleware';
import { Config } from '@/model/Config';

const router = new Router().use(auth, customerServiceOnly);
router.get('/:key', async (ctx) => {
  ctx.body = await Config.get(ctx.params.key);
});
router.patch('/:key', async (ctx) => {
  const { value } = await Config.set(ctx.params.key, ctx.request.body);
  ctx.body = value
});

export default router;
