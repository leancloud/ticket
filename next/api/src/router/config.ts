import Router from '@koa/router';
import _ from 'lodash';
import * as yup from '@/utils/yup';
import { auth, customerServiceOnly } from '@/middleware';
import { Config } from '@/model/Config';

const router = new Router().use(auth, customerServiceOnly);

const configKeySchema = yup.object({
  key: yup.string().oneOf(['work_time', 'weekday']).required(),
});

router.get('/:key', async (ctx) => {
  const { key } = configKeySchema.validateSync(ctx.params);
  ctx.body = await Config.get(key);
});

router.patch('/:key', async (ctx) => {
  const { key } = configKeySchema.validateSync(ctx.params);
  const { value } = await Config.set(key, ctx.request.body);
  ctx.body = value;
});

export default router;
