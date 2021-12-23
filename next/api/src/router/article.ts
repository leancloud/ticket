import Router from '@koa/router';

import { Article, getPublicArticle } from '@/model/Article';
import { ArticleResponse } from '@/response/article';
import { z } from 'zod';
import _ from 'lodash';
import { auth, boolean, customerServiceOnly, pagination } from '@/middleware';
import { ACLBuilder, CreateData, UpdateData } from '@/orm';
import htmlify from '@/utils/htmlify';
import { User } from '@/model/User';
import { Category } from '@/model/Category';
import { CategoryResponse } from '@/response/category';

const router = new Router();

router.get('/', pagination(20), boolean('private'), async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const { ['private']: prvt } = boolean.get(ctx);

  const sessionToken = ctx.get('X-LC-Session');
  const query = Article.queryBuilder()
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize);
  if (prvt !== undefined) {
    query.where('archived', prvt ? '==' : '!=', true);
  }
  const articles = ctx.query.count
    ? await query
        .findAndCount({
          sessionToken,
        })
        .then(([data, count]) => {
          ctx.set('x-total-count', count.toString());
          return data;
        })
    : await query.find({
        sessionToken,
      });

  ctx.body = articles.map((article) => new ArticleResponse(article));
});

const createArticalSchema = z.object({
  title: z.string(),
  content: z.string(),
  private: z.boolean().optional(),
});
router.post('/', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const { title, content, ['private']: prvt } = createArticalSchema.parse(ctx.request.body);
  const data: CreateData<Article> = { title };
  data.content = content;
  data.contentHTML = htmlify(content);
  if (prvt !== undefined) {
    data.private = prvt;
    data.ACL = getACL(prvt);
  }
  const article = await Article.create(data, currentUser.getAuthOptions());
  ctx.body = new ArticleResponse(article);
});

router.param('id', async (id, ctx, next) => {
  let article;
  // Use cached result only for GET request.
  // This is a temporary workaround before we replace the memery cache with redis.
  // if (ctx.request.method !== 'GET') {
  //   article = await getPublicArticle(id);
  // }
  // if (!article) {
  //   const sessionToken = ctx.get('X-LC-Session');
  //   if (sessionToken) {
  //     article = await Article.find(id, { sessionToken });
  //   }
  // }
  const sessionToken = ctx.get('X-LC-Session');
  if (sessionToken) {
    article = await Article.find(id, { sessionToken });
  } else {
    article = await getPublicArticle(id);
  }

  if (!article) {
    ctx.throw(404, 'Article not found');
  }
  ctx.state.article = article;
  return next();
});

router.get('/:id/categories', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const associatedCategories = await Category.query()
    .where('FAQs', '==', article.toPointer())
    .find(currentUser.getAuthOptions());
  ctx.body = associatedCategories.map((category) => new CategoryResponse(category));
});

router.get('/:id', async (ctx) => {
  const article = ctx.state.article as Article;
  ctx.body = new ArticleResponse(article);
});

const getACL = (prvt: boolean) => {
  const ACL = new ACLBuilder();
  ACL.allowCustomerService('read', 'write').allowStaff('read');
  if (!prvt) {
    ACL.allow('*', 'read');
  }
  return ACL;
};

const updateArticalSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  private: z.boolean().optional(),
});
router.patch('/:id', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const { title, content, ['private']: prvt } = updateArticalSchema.parse(ctx.request.body);
  const updateData: UpdateData<Article> = { title };
  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }
  if (prvt !== undefined) {
    updateData.private = prvt;
    updateData.ACL = getACL(prvt);
  }

  if (!_.isEmpty(updateData)) {
    await article.update(updateData, currentUser.getAuthOptions());
  }

  ctx.body = new ArticleResponse(article);
});
router.delete('/:id', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  if (article.private !== true) {
    ctx.throw(400, 'Article is not private');
  }
  const associatedCategoryCount = await Category.query()
    .where('FAQs', '==', article.toPointer())
    .count(currentUser.getAuthOptions());
  if (associatedCategoryCount > 0) {
    ctx.throw(400, 'Article is in use');
  }
  await article.delete(currentUser.getAuthOptions());
  ctx.body = {};
});

export default router;
