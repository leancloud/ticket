import Router from '@koa/router';

import { auth, customerServiceOnly } from '../middleware/auth';
import { Group } from '../model/group';

const router = new Router().use(auth, customerServiceOnly);

router.get('/', async (ctx) => {
  const groups = await Group.query().get(ctx.state.currentUser);
  ctx.body = groups.map((group) => ({ id: group.id, name: group.name }));
});

export default router;
