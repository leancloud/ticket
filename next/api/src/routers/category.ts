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
    if (active) {
      categories = categories.filter((c) => !c.deletedAt);
    } else {
      categories = categories.filter((c) => c.deletedAt);
    }
  }

  ctx.body = categories;
});

export default router;
