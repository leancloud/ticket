import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middlewares/auth';
import { search } from '../middlewares/search';
import { getAll as getCategories } from '../objects/category';

const router = new Router().use(auth);

const getCategoriesSchema = yup.object({
  active: yup.bool(),
});

router.get('/', search, async (ctx) => {
  const { active } = getCategoriesSchema.validateSync(ctx.query);

  let categories = await getCategories();
  if (active !== undefined) {
    categories = categories.filter((c) => (active ? !c.deletedAt : c.deletedAt));
  }

  ctx.body = categories.map((c) => {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      template: c.qTemplate,
      parentId: c.parentId,
      order: c.order,
      active: !c.deletedAt,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    };
  });
});

export default router;
