import { Context } from 'koa';
import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middleware/auth';
import { Category, CategoryManager } from '../model/Category';
import { TicketForm } from '../model/TicketForm';
import { CategoryResponse, CategoryFieldResponse } from '../response/category';
import { Article, getArticle } from '../model/Article';
import { ArticleResponse } from '../response/article';
import _ from 'lodash';

const router = new Router();

router.param('id', async (id, ctx, next) => {
  const article = await getArticle(id);
  if (!article) {
    ctx.throw(404, 'Not Found');
  }
  ctx.state.article = article;
  return next();
});

router.get('/:id', async (ctx) => {
  const article = ctx.state.article as Article;
  ctx.body = new ArticleResponse(article);
});

export default router;
