import Router from '@koa/router';

import { auth } from '@/middleware/auth';
import { Notification } from '@/model/Notification';
import { User } from '@/model/User';
import { NotificationResponse } from '@/response/notification';

const NOTIFICATIONS_PER_PAGE = 25;

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  let query = Notification.query()
    .where('user', '==', currentUser.toPointer())
    .preload('ticket')
    .orderBy('latestActionAt')
    .limit(NOTIFICATIONS_PER_PAGE);

  const beforeParam = ctx.request.query['before'];
  if (typeof beforeParam === 'string') {
    const before = new Date(beforeParam);
    query = query.where('latestActionAt', '<', before);
  }

  if (ctx.request.query['unread']) {
    query = query.where('unreadCount', '>', 0);
  }

  const notifications = await query.find({ sessionToken: currentUser.sessionToken });
  ctx.body = notifications.map((notification) => new NotificationResponse(notification));
});

export default router;
