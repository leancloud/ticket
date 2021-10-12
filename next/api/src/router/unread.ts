import Router from '@koa/router';

import { auth } from '@/middleware/auth';
import { Notification } from '@/model/Notification';
import { User } from '@/model/User';

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const unreadNotification = await Notification.query()
    .where('user', '==', currentUser.toPointer())
    .where('unreadCount', '>=', 0)
    .first({ useMasterKey: true });

  const unread = !!unreadNotification;

  ctx.body = unread;
});

export default router;
