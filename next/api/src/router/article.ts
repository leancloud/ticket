import Router from '@koa/router';

import { Article, getPublicArticle } from '@/model/Article';
import { ArticleResponse } from '@/response/article';
import * as yup from '@/utils/yup';
import _ from 'lodash';
import { auth, customerServiceOnly, pagination } from '@/middleware';
import { ACLBuilder, CreateData, UpdateData } from '@/orm';
import htmlify from '@/utils/htmlify';
import { User } from '@/model/User';
import { Category } from '@/model/Category';
import { CategoryResponse } from '@/response/category';
import { ArticleRevision } from '@/model/ArticleRevision';

import {
  ArticleRevisionListItemResponse,
  ArticleRevisionResponse,
} from '@/response/article-revision';
import { FeedbackType } from '@/model/ArticleFeedback';

const router = new Router();

const findArticlesOptionSchema = yup.object({
  private: yup.boolean(),
  id: yup.csv(yup.string().required()),
});

router.get('/', pagination(20), async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const { ['private']: prvt, id } = findArticlesOptionSchema.validateSync(ctx.request.query);

  const sessionToken = ctx.get('X-LC-Session');
  const query = Article.queryBuilder()
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  if (prvt !== undefined) {
    query.where('archived', prvt ? '==' : '!=', true);
  }
  if (id !== undefined) {
    query.where('objectId', 'in', id);
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

const createArticalSchema = yup.object({
  title: yup.string().required(),
  content: yup.string().required(),
  private: yup.boolean(),
});

router.post('/', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const { title, content, ['private']: prvt } = createArticalSchema.validateSync(ctx.request.body);
  const data: CreateData<Article> = { title };
  if (content) {
    data.content = content;
    data.contentHTML = htmlify(content);
  }
  if (prvt !== undefined) {
    data.private = prvt;
    data.ACL = getACL(prvt);
  }
  const article = await Article.create(data, currentUser.getAuthOptions());
  await article.createRevision(currentUser, article);
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
    .orWhere('notices', '==', article.toPointer())
    .find(currentUser.getAuthOptions());
  ctx.body = associatedCategories.map((category) => new CategoryResponse(category));
});

const getRevisionsSchema = yup.object({
  meta: yup.boolean(),
});

router.get('/:id/revisions', auth, customerServiceOnly, pagination(100), async (ctx) => {
  const article = ctx.state.article as Article;
  const { meta } = getRevisionsSchema.validateSync(ctx.query);

  const { page, pageSize } = pagination.get(ctx);

  const query = ArticleRevision.queryBuilder()
    .where('FAQ', '==', article.toPointer())
    .orderBy('createdAt', 'desc')
    .paginate(page, pageSize)
    .limit(pageSize)
    .preload('author');

  if (meta !== undefined) {
    query.where('meta', meta ? '==' : '!=', true);
  }

  const revisions = await query.findAndCount({ useMasterKey: true }).then(([data, count]) => {
    ctx.set('x-total-count', count.toString());
    return data;
  });

  ctx.body = revisions.map((revision) => new ArticleRevisionListItemResponse(revision));
});

router.param('rid', async (rid, ctx, next) => {
  ctx.state.revision = await ArticleRevision.find(rid, {
    useMasterKey: true,
  });
  return next();
});

router.get('/:id/revisions/:rid', auth, customerServiceOnly, pagination(100), async (ctx) => {
  const revision = ctx.state.revision as ArticleRevision;
  ctx.body = new ArticleRevisionResponse(revision);
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

const updateArticalSchema = yup.object({
  title: yup.string(),
  content: yup.string(),
  private: yup.boolean(),
  comment: yup.string(),
});

router.patch('/:id', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const { title, content, ['private']: prvt, comment } = updateArticalSchema.validateSync(
    ctx.request.body
  );
  const updateData: UpdateData<Article> = { title };
  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }
  if (prvt !== undefined) {
    updateData.private = prvt;
    updateData.ACL = getACL(prvt);
  }

  const updated = !_.isEmpty(updateData);
  const updatedArticle = updated
    ? await article.update(updateData, currentUser.getAuthOptions())
    : article;

  if (updated) {
    await article.createRevision(currentUser, updatedArticle, article, comment);
  }

  ctx.body = new ArticleResponse(updatedArticle);
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

const feedbackSchema = yup.object({
  type: yup.mixed().oneOf([FeedbackType.Upvote, FeedbackType.Downvote]).required(),
});
router.post('/:id/feedback', auth, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const { type } = feedbackSchema.validateSync(ctx.request.body);
  await article.feedback(type, currentUser);
  ctx.body = {};
});

export default router;
