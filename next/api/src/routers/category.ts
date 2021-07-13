import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middlewares/auth';
import { search } from '../middlewares/search';
import { Category } from '../models/category';

const router = new Router().use(auth);

const getCategoriesSchema = yup.object({
  active: yup.bool(),
});

router.get('/', search, async (ctx) => {
  const { active } = getCategoriesSchema.validateSync(ctx.query);

  let categories = await Category.getAll();
  if (active !== undefined) {
    categories = categories.filter((c) => c.active === active);
  }

  ctx.body = categories.map((c) => {
    return {
      id: c.id,
      name: c.name,
      parents: c.parents,
      order: c.order,
      active: c.active,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    };
  });
});

export default router;
