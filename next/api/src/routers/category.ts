import { Context } from 'koa';
import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middlewares/auth';
import { Categories, Category } from '../models/category';

const router = new Router().use(auth);

const getCategoriesSchema = yup.object({
  active: yup.bool(),
});

router.get('/', async (ctx) => {
  const { active } = getCategoriesSchema.validateSync(ctx.query);

  let categories = (await Categories.create()).getAll();
  if (active === true) {
    categories = categories.filter((c) => !c.deletedAt);
  } else if (active === false) {
    categories = categories.filter((c) => c.deletedAt);
  }

  ctx.body = categories.map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    position: c.order,
    active: !c.deletedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
});

router.param('id', async (id, ctx, next) => {
  const categories = await Categories.create();
  ctx.state.category = categories.get(id);
  return next();
});

function getPreferedLocale(ctx: Context): string {
  let locale: string;
  if (ctx.query.locale) {
    if (typeof ctx.query.locale === 'string') {
      locale = ctx.query.locale;
    } else {
      locale = ctx.query.locale[ctx.query.locale.length - 1];
    }
  } else {
    locale = ctx.get('Accept-Language') ?? 'en';
  }
  return locale.toLowerCase();
}

router.get('/:id/fields', async (ctx) => {
  const locale = getPreferedLocale(ctx);
  const category = ctx.state.category as Category;
  if (category.form) {
    ctx.body = await category.form.getFieldVariants(locale);
  } else {
    ctx.body = [];
  }
});

export default router;
