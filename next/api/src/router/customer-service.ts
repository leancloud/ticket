import Router from '@koa/router';

import { auth, customerServiceOnly } from '../middleware/auth';
import { Group } from '../model/group';
import { User } from '../model/user';
import { GroupJson } from '../json/group';
import { UserJson } from '../json/user';

const router = new Router().use(auth, customerServiceOnly);

router.get('/', async (ctx) => {
  const users = await User.getCustomerServices();
  ctx.body = users.map((u) => new UserJson(u));
});

router.param('user', async (id, ctx, next) => {
  if (id === 'me') {
    ctx.state.user = ctx.state.currentUser;
  } else {
    const user = await User.find(id);
    if (!(await user.isCustomerService())) {
      ctx.throw(404);
    }
    ctx.state.user = user;
  }
  return next();
});

router.get('/:user', (ctx) => {
  ctx.body = new UserJson(ctx.state.user);
});

router.get('/:user/groups', async (ctx) => {
  const groups = await Group.findByUser(ctx.state.user);
  ctx.body = groups.map((g) => new GroupJson(g));
});

export default router;
