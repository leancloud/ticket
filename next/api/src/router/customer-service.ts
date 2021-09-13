import Router from '@koa/router';

import { auth, customerServiceOnly } from '../middleware/auth';
import { Group } from '../model/Group';
import { Role } from '../model/Role';
import { User } from '../model/User';
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
    const user = await User.findOrFail(id);
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
  const user = ctx.state.user as User;
  const roles = await Role.queryBuilder()
    .where('name', 'starts-with', 'group_')
    .where('users', '==', user.toPointer())
    .find({ useMasterKey: true });
  const groups = await Group.queryBuilder()
    .where(
      'role',
      'in',
      roles.map((r) => r.toPointer())
    )
    .find({ useMasterKey: true });
  ctx.body = groups.map((g) => new GroupJson(g));
});

export default router;
