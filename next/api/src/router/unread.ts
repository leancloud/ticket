import Router from '@koa/router';
import AV from 'leancloud-storage';

import { auth } from '@/middleware/auth';

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser;

  const unreadNotificationQuery = new AV.Query('notification')
    .equalTo('user', AV.Object.createWithoutData('_User', currentUser.id))
    .greaterThan('unreadCount', 0);
  const unreadNotification = await unreadNotificationQuery.first({ useMasterKey: true });
  const unread = !!unreadNotification;

  ctx.body = unread;
});

export default router;
