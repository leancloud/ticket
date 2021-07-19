import Router from '@koa/router';

import { auth, customerServiceOnly } from '../middlewares/auth';
import { Group } from '../models/group';
import { User } from '../models/user';

const router = new Router().use(auth, customerServiceOnly);

router.param('user', async (id, ctx, next) => {
  if (id === 'me') {
    ctx.state.user = ctx.state.currentUser;
  } else {
    const user = await User.get(id);
    if (!(await user.isCustomerService())) {
      ctx.throw(404);
    }
    ctx.state.user = user;
  }
  return next();
});

router.get('/:user/groups', async (ctx) => {
  const user = ctx.state.user as User;
  const groups = await Group.findForUser(user.id);
  ctx.body = groups;
});

export default router;
