import Router from '@koa/router';

import { auth } from '@/middleware';
import { Organization } from '@/model/Organization';
import { User } from '@/model/User';
import { OrganizationResponse } from '@/response/organization';

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const organizations = await Organization.queryBuilder().find(currentUser.getAuthOptions());
  ctx.body = organizations.map((o) => new OrganizationResponse(o));
});

export default router;
