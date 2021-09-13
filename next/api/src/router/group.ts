import Router from '@koa/router';

import { auth, customerServiceOnly } from '../middleware/auth';
import { Group } from '../model/Group';
import { User } from '../model/User';
import { GroupResponse } from '../json/group';

const router = new Router().use(auth, customerServiceOnly);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const groups = await Group.queryBuilder().find(currentUser.getAuthOptions());
  ctx.body = groups.map((g) => new GroupResponse(g));
});

export default router;
