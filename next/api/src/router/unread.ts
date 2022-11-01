import Router from '@koa/router';
import * as yup from '@/utils/yup';

import { auth } from '@/middleware/auth';
import { User } from '@/model/User';
import { categoryService } from '@/category';
import { withAsyncSpan, withSpan } from '@/utils/trace';
import { Notification } from '@/model/Notification';

const router = new Router().use(auth);

const getUnreadSchema = yup.object({
  product: yup.string(),
});

router.get(
  '/',
  withSpan(async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const { product } = getUnreadSchema.validateSync(ctx.request.query);

    const query = Notification.queryBuilder()
      .where('user', '==', currentUser.toPointer())
      .where('unreadCount', '>', 0);

    if (product) {
      const categories = await withAsyncSpan(
        () => categoryService.getSubCategories(product, true),
        ctx,
        'service',
        'getCategories'
      );
      query.where(
        'category',
        'in',
        categories.map((category) => category.toPointer())
      );
    }

    const unreadNotification = await withAsyncSpan(
      () => query.first({ sessionToken: currentUser.sessionToken }),
      ctx,
      'lc',
      'fetchUnreadNotification'
    );
    const unread = !!unreadNotification;

    ctx.body = unread;
  }, 'controller')
);

export default router;
