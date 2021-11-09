import Router from '@koa/router';

import { Article, getArticle } from '@/model/Article';
import { ArticleResponse } from '@/response/article';
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
