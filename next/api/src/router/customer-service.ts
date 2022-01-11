import Router from '@koa/router';

import { auth, customerServiceOnly } from '@/middleware/auth';
import { User } from '@/model/User';
import { GroupResponse } from '@/response/group';
import { UserResponse } from '@/response/user';

const router = new Router().use(auth, customerServiceOnly);

router.get('/', async (ctx) => {
  const users = await User.getCustomerServices();
  ctx.body = users.map((u) => new UserResponse(u));
});

router.param('user', async (id, ctx, next) => {
  if (id === 'me') {
    ctx.state.user = ctx.state.currentUser;
  } else {
    const user = await User.findOrFail(id);
    if (!(await user.isCustomerService())) {
      ctx.throw(404);
    }
    ctx.state.user = user;
  }
  return next();
});

router.get('/:user', (ctx) => {
  ctx.body = new UserResponse(ctx.state.user);
});

router.get('/:user/groups', async (ctx) => {
  const user = ctx.state.user as User;
  const groups = await user.getGroups();
  ctx.body = groups.map((g) => new GroupResponse(g));
});

export default router;
