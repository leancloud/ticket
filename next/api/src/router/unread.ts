import Router from '@koa/router';
import { auth } from '../middleware/auth';
import { Query, User, Object } from 'leancloud-storage';

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser;

  const unreadNotificationQuery = new Query('notification')
    .equalTo('user', Object.createWithoutData(User, currentUser.id))
    .greaterThan('unreadCount', 0);
  const unreadNotification = await unreadNotificationQuery.first({ useMasterKey: true });
  const unread = !!unreadNotification;

  ctx.body = unread;
});

export default router;
