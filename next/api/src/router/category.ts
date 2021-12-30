import { Context } from 'koa';
import Router from '@koa/router';

import * as yup from '@/utils/yup';
import { Category, CategoryManager } from '@/model/Category';
import { TicketForm } from '@/model/TicketForm';
import { CategoryResponse, CategoryFieldResponse } from '@/response/category';
import { getPublicArticle } from '@/model/Article';
import { ArticleResponse } from '@/response/article';
import _ from 'lodash';

const router = new Router();

const getCategoriesSchema = yup.object({
  active: yup.bool(),
});

router.get('/', async (ctx) => {
  const { active } = getCategoriesSchema.validateSync(ctx.query);

  let categories = await CategoryManager.get();
  if (active !== undefined) {
    const filter = active
      ? (c: Category) => c.deletedAt === undefined
      : (c: Category) => c.deletedAt !== undefined;
    categories = categories.filter(filter);
  }

  ctx.body = categories.map((c) => new CategoryResponse(c));
});

router.param('id', async (id, ctx, next) => {
  const category = await CategoryManager.find(id);
  if (!category) {
    ctx.throw(404, 'No such category');
  }
  ctx.state.category = category;
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

  if (!category.formId) {
    ctx.body = [];
    return;
  }

  const form = await TicketForm.find(category.formId, { useMasterKey: true });
  if (!form) {
    ctx.body = [];
    return;
  }

  const variants = await form.getFieldVariants(locale);
  ctx.body = variants.map((v) => new CategoryFieldResponse(v));
});

router.get('/:id/faqs', async (ctx) => {
  const { FAQIds: articleIds } = ctx.state.category as Category;

  if (!articleIds) {
    ctx.body = [];
    return;
  }

  const articles = await Promise.all(articleIds.map(getPublicArticle));
  ctx.body = articles
    .filter((article) => article && !article.private)
    .map((article) => new ArticleResponse(article!));
});

router.get('/:id/notices', async (ctx) => {
  const { noticeIds: articleIds } = ctx.state.category as Category;

  if (!articleIds) {
    ctx.body = [];
    return;
  }

  const articles = await Promise.all(articleIds.map(getPublicArticle));
  ctx.body = articles
    .filter((article) => article && !article.private)
    .map((article) => new ArticleResponse(article!));
});

export default router;
