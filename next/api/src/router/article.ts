import Router from '@koa/router';

import { Article, getPublicArticle } from '@/model/Article';
import {
  ArticleResponse,
  ArticleTranslationAbstractResponse,
  ArticleTranslationResponse,
} from '@/response/article';
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
import { ArticleTranslation } from '@/model/ArticleTranslation';
import { localeSchemaForYup, matchLocale } from '@/utils/locale';
import { Middleware } from '@koa/router';

const router = new Router();

interface ArticleState {
  article: Article;
  translation: ArticleTranslation;
}

const fetchPreferTranslation: Middleware<ArticleState> = async (ctx, next) => {
  if (!ctx.state.article) {
    ctx.throw(404, 'Article not found');
    return;
  }

  const translationQb = ArticleTranslation.queryBuilder().where(
    'article',
    '==',
    ctx.state.article.toPointer()
  );

  const sessionToken = ctx.get('X-LC-Session');

  if (!sessionToken) {
    translationQb.where('private', '==', false);
  }

  const translation = matchLocale(
    await translationQb.find(sessionToken ? { sessionToken } : undefined),
    (translation) => translation.language,
    ctx.locales.matcher,
    ctx.state.article.defaultLanguage
  );

  if (!translation) {
    ctx.throw(404, 'Article not found');
    return;
  }

  translation && (translation.article = ctx.state.article);
  ctx.state.translation = translation;
  return next();
};

const findArticlesOptionSchema = yup.object({
  private: yup.boolean(),
  id: yup.csv(yup.string().required()),
});

// get article list
router.get('/', pagination(20), auth, customerServiceOnly, async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const { private: isPrivate, id } = findArticlesOptionSchema.validateSync(ctx.request.query);

  const sessionToken = ctx.get('X-LC-Session');
  const query = Article.queryBuilder()
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  if (isPrivate !== undefined) {
    query.where('private', '==', isPrivate);
  }

  if (id !== undefined) {
    query.where('objectId', 'in', id);
  }

  const articles = await query.find({ sessionToken });

  if (ctx.query.count) {
    ctx.set('X-Total-Count', articles.length.toString());
  }

  ctx.body = articles.map((article) => new ArticleResponse(article));
});

router.get('/detail', pagination(20), auth, customerServiceOnly, async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const { private: isPrivate, id } = findArticlesOptionSchema.validateSync(ctx.request.query);

  const sessionToken = ctx.get('X-LC-Session');
  const articleQb = Article.queryBuilder()
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const translationQb = ArticleTranslation.queryBuilder();

  if (isPrivate !== undefined) {
    articleQb.where('private', '==', isPrivate);
    translationQb.where('private', '==', isPrivate);
  }

  if (id) {
    articleQb.where('objectId', 'in', id);
    translationQb.where('article', 'in', id.map(Article.ptr));
  }

  const articles = await articleQb.find({ sessionToken });
  const translations = await translationQb.find({ useMasterKey: true });

  const articleById = _.keyBy(articles, (a) => a.id);

  return _(translations)
    .groupBy((t) => t.articleId)
    .mapValues((translations, id) =>
      matchLocale(
        translations,
        (t) => t.language,
        ctx.locales.matcher,
        articleById[id].defaultLanguage
      )
    )
    .values()
    .compact()
    .value()
    .map((t) => {
      t.article = articleById[t.articleId!];
      return new ArticleTranslationResponse(t);
    });
});

const createBaseArticleSchema = yup.object({
  name: yup.string().required(),
  private: yup.boolean(),
  language: localeSchemaForYup.required(),
  title: yup.string().required(),
  content: yup.string().required(),
});

// create new article
router.post('/', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const {
    name,
    private: isPrivate,
    language,
    title,
    content,
  } = createBaseArticleSchema.validateSync(ctx.request.body);

  const data: CreateData<Article> = { name, defaultLanguage: language };
  const translationData: CreateData<ArticleTranslation> = { title, language };

  if (content) {
    translationData.content = content;
    translationData.contentHTML = htmlify(content);
  }

  if (isPrivate !== undefined) {
    data.private = isPrivate;
    data.ACL = getACL(isPrivate);
    translationData.private = isPrivate;
    translationData.ACL = getACL(isPrivate);
  }

  const article = await Article.create(data, currentUser.getAuthOptions());

  translationData.articleId = article.id;

  const translation = await ArticleTranslation.create(translationData, { useMasterKey: true });
  await translation.createRevision(currentUser, translation);

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

// get translation of article :id based on use prefer
router.get('/:id', fetchPreferTranslation, async (ctx) => {
  const translation = ctx.state.translation;

  ctx.body = new ArticleTranslationResponse(translation);
});

// get article :id
router.get('/:id/info', auth, customerServiceOnly, async (ctx) => {
  const article = ctx.state.article as Article;

  ctx.body = new ArticleResponse(article);
});

// get translations of article :id
router.get('/:id/translations', auth, customerServiceOnly, async (ctx) => {
  const article = ctx.state.article as Article;

  ctx.body = (await article.getTranslations()).map(
    (translations) => new ArticleTranslationAbstractResponse(translations)
  );
});

// get a list of category which uses article :id
router.get('/:id/categories', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const associatedCategories = await Category.query()
    .where('FAQs', '==', article.toPointer())
    .orWhere('notices', '==', article.toPointer())
    .find(currentUser.getAuthOptions());
  ctx.body = associatedCategories.map((category) => new CategoryResponse(category));
});

const createArticleTranslationSchema = yup.object({
  language: localeSchemaForYup.required(),
  title: yup.string().required(),
  content: yup.string().required(),
  private: yup.boolean(),
});

// create translation for article :id
router.post('/:id', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;

  const {
    language,
    title,
    content,
    private: isPrivate,
  } = createArticleTranslationSchema.validateSync(ctx.request.body);

  const data: CreateData<ArticleTranslation> = { title, language };

  if (content) {
    data.content = content;
    data.contentHTML = htmlify(content);
  }

  if (isPrivate !== undefined) {
    data.private = isPrivate;
    data.ACL = getACL(isPrivate);
  }

  data.articleId = article.id;

  const translation = await ArticleTranslation.create(data, { useMasterKey: true });
  await translation.createRevision(currentUser, translation);

  translation.article = article;

  ctx.body = new ArticleTranslationResponse(translation);
});

const feedbackSchema = yup.object({
  type: yup.number().oneOf([FeedbackType.Upvote, FeedbackType.Downvote]).required(),
});

// add feedback for translation of user preferred language of article :id
router.post('/:id/feedback', auth, fetchPreferTranslation, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const translation = ctx.state.translation;

  const { type } = feedbackSchema.validateSync(ctx.request.body);

  await translation.feedback(type, currentUser);
  ctx.body = {};
});

const updateBaseArticleSchema = yup.object({
  name: yup.string(),
  private: yup.boolean(),
  defaultLanguage: yup.string(),
});

// update article :id
router.patch('/:id', auth, customerServiceOnly, async (ctx) => {
  const article = ctx.state.article as Article;
  const { name, private: isPrivate, defaultLanguage } = updateBaseArticleSchema.validateSync(
    ctx.request.body
  );

  const data: UpdateData<Article> = { name, defaultLanguage };

  if (isPrivate !== undefined) {
    data.private = isPrivate;
    data.ACL = getACL(isPrivate);
  }

  const updatedArticle = await article.update(data, { useMasterKey: true });

  ctx.body = new ArticleResponse(updatedArticle);
});

// delete article :id
router.delete('/:id', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;

  if (article.private !== true) {
    ctx.throw(400, 'Article is not private');
  }

  const associatedCategoryCount = await Category.query()
    .where('FAQs', '==', article.toPointer())
    .count({ useMasterKey: true });

  if (associatedCategoryCount > 0) {
    ctx.throw(400, 'Article is in use');
  }

  const translations = await ArticleTranslation.queryBuilder()
    .where('article', '==', article.toPointer())
    .where('deletedAt', 'not-exists')
    .count({ useMasterKey: true });

  if (translations) {
    ctx.throw(400, 'Article has undeleted translations');
  }

  await article.delete(currentUser.getAuthOptions());
  ctx.body = {};
});

router.param('language', async (language, ctx, next) => {
  if (ctx.params.id) {
    const translation = await ArticleTranslation.queryBuilder()
      .where('language', '==', language)
      .where('article', '==', Article.ptr(ctx.params.id))
      .first({ useMasterKey: true });

    translation && (translation.article = ctx.state.article);

    ctx.state.translation = translation;
  }

  return next();
});

// get :language translation of article :id
router.get('/:id/:language', async (ctx) => {
  const translation = ctx.state.translation as ArticleTranslation;

  ctx.body = new ArticleTranslationResponse(translation);
});

const updateArticleTranslationSchema = yup.object({
  title: yup.string(),
  content: yup.string(),
  private: yup.boolean(),
  comment: yup.string(),
});

// update :language translation of article :id
router.patch('/:id/:language', auth, customerServiceOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const translation = ctx.state.translation as ArticleTranslation;

  const {
    title,
    content,
    private: isPrivate,
    comment,
  } = updateArticleTranslationSchema.validateSync(ctx.request.body);

  const updateData: UpdateData<ArticleTranslation> = { title };

  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }

  if (isPrivate !== undefined) {
    updateData.private = isPrivate;
    updateData.ACL = getACL(isPrivate);
  }

  if (updateData.private && translation.language === article.defaultLanguage) {
    ctx.throw(400, 'Can not set default language to private');
    return;
  }

  const updated = !_.isEmpty(updateData);

  const updatedTranslation = updated
    ? await translation.update(updateData, { useMasterKey: true })
    : translation;

  if (updated) {
    await translation.createRevision(currentUser, updatedTranslation, translation, comment);
  }

  ctx.body = new ArticleTranslationResponse(updatedTranslation);
});

// delete :language translation of article :id
router.delete('/:id/:language', auth, customerServiceOnly, async (ctx) => {
  const translation = ctx.state.translation as ArticleTranslation;

  if (!translation.private) {
    ctx.throw(400, 'Translation is not private');
  }

  await translation.delete({ useMasterKey: true });
  ctx.body = {};
});

const getRevisionsSchema = yup.object({
  meta: yup.boolean(),
});

// get revision list of :language translation of article :id
router.get('/:id/:language/revisions', auth, customerServiceOnly, pagination(100), async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const translation = ctx.state.translation as ArticleTranslation;
  const { meta } = getRevisionsSchema.validateSync(ctx.query);

  const { page, pageSize } = pagination.get(ctx);

  const query = ArticleRevision.queryBuilder()
    .where('FAQTranslation', '==', translation.toPointer())
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

  const includeRating = await currentUser.isCustomerService();
  ctx.body = revisions.map(
    (revision) => new ArticleRevisionListItemResponse(revision, includeRating)
  );
});

router.param('rid', async (rid, ctx, next) => {
  ctx.state.revision = await ArticleRevision.find(rid, {
    useMasterKey: true,
  });
  return next();
});

// get revision :rid
router.get(
  '/:id/:language/revisions/:rid',
  auth,
  customerServiceOnly,
  pagination(100),
  async (ctx) => {
    const revision = ctx.state.revision as ArticleRevision;
    ctx.body = new ArticleRevisionResponse(revision);
  }
);

const getACL = (isPrivate: boolean) => {
  const ACL = new ACLBuilder();
  ACL.allowCustomerService('read', 'write').allowStaff('read');
  if (!isPrivate) {
    ACL.allow('*', 'read');
  }
  return ACL;
};

export default router;
