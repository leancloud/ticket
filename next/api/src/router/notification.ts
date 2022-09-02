import Router from '@koa/router';

import { auth } from '@/middleware/auth';
import { Notification } from '@/model/Notification';
import { User } from '@/model/User';
import { NotificationResponse } from '@/response/notification';
import _ from 'lodash';
import { parseDateParam } from '@/utils';
import { categoryService } from '@/category';

const DEFAULT_NOTIFICATIONS_PER_PAGE = 25;

const router = new Router().use(auth);

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const limit = Number(ctx.request.query['limit'] || DEFAULT_NOTIFICATIONS_PER_PAGE);

  const query = Notification.queryBuilder()
    .where('user', '==', currentUser.toPointer())
    .preload('ticket')
    .orderBy('latestActionAt', 'desc')
    .limit(limit);

  const beforeParam = ctx.request.query['before'];
  if (typeof beforeParam === 'string') {
    let before = parseDateParam(beforeParam);
    query.where('latestActionAt', '<', before);
  }

  if (ctx.request.query['unread']) {
    query.where('unreadCount', '>', 0);
  }

  const product = ctx.request.query['product'];
  if (product) {
    const categories = await categoryService.getSubCategories(product, true);
    query.where(
      'category',
      'in',
      categories.map((category) => category.toPointer())
    );
  }

  const includeTicketMetaKeys = _.castArray(ctx.request.query['includeTicketMetaKeys'])
    .join(',')
    .split(',');
  const notifications = await query.find({ sessionToken: currentUser.sessionToken });
  ctx.body = notifications.map((notification) =>
    new NotificationResponse(notification).toJSON({
      includeTicketMetaKeys,
    })
  );
});

router.post('/read-all', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  let query = Notification.queryBuilder()
    .where('user', '==', currentUser.toPointer())
    .where('unreadCount', '>', 0);
  const product = ctx.request.query['product'];
  if (product) {
    const categories = await categoryService.getSubCategories(product, true);
    query.where(
      'category',
      'in',
      categories.map((category) => category.toPointer())
    );
  }
  const notifications = await query.find({ sessionToken: currentUser.sessionToken });

  await Notification.updateSome(
    notifications.map((n) => [n, { unreadCount: 0 }]),
    { useMasterKey: true }
  );

  ctx.body = {};
});

export default router;
