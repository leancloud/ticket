import Router from '@koa/router';
import * as yup from '@/utils/yup';

import { auth } from '@/middleware/auth';
import { Notification } from '@/model/Notification';
import { User } from '@/model/User';
import { CategoryService } from '@/service/category';

const router = new Router().use(auth);

const getUnreadSchema = yup.object({
  product: yup.string(),
});

router.get('/', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const { product } = getUnreadSchema.validateSync(ctx.request.query);

  const query = Notification.queryBuilder()
    .where('user', '==', currentUser.toPointer())
    .where('unreadCount', '>', 0);

  if (product) {
    const categories = await CategoryService.getSubCategories(product, true);
    query.where(
      'category',
      'in',
      categories.map((category) => category.toPointer())
    );
  }

  const unreadNotification = await query.first({ sessionToken: currentUser.sessionToken });
  const unread = !!unreadNotification;

  ctx.body = unread;
});

export default router;
