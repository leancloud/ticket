import Router, { Middleware } from '@koa/router';
import _ from 'lodash';

import { Article } from '@/model/Article';
import {
  ArticleResponse,
  ArticleTranslationAbstractResponse,
  ArticleTranslationResponse,
} from '@/response/article';
import * as yup from '@/utils/yup';
import { adminOnly, auth, pagination } from '@/middleware';
import { CreateData, UpdateData } from '@/orm';
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
import { ArticleTranslation, getArticleTranslation } from '@/model/ArticleTranslation';
import { localeSchemaForYup } from '@/utils/locale';
import { articleService } from '@/article/article.service';

const router = new Router();

interface ArticleState {
  article: Article;
  translation: ArticleTranslation;
}

const fetchPreferredTranslation: Middleware<ArticleState> = async (ctx, next) => {
  const article = ctx.state.article;

  // TODO: read cache only once (now twice 👀)
  const translation = await getArticleTranslation(article.id, ctx.locales.matcher);
  if (!translation) {
    ctx.throw(404, 'Article not found');
    return;
  }

  ctx.state.translation = translation;
  return next();
};

const findArticlesOptionSchema = yup.object({
  private: yup.boolean(),
  id: yup.csv(yup.string().required()),
});

// get article list
router.get('/', pagination(20), auth, adminOnly, async (ctx) => {
  const { page, pageSize } = pagination.get(ctx);
  const { private: isPrivate, id } = findArticlesOptionSchema.validateSync(ctx.request.query);

  const query = Article.queryBuilder()
    .where('deletedAt', 'not-exists')
    .orderBy('createdAt', 'desc')
    .paginate(page, pageSize);

  if (isPrivate !== undefined) {
    const now = new Date();
    if (isPrivate) {
      query.where((query) => {
        query.where('publishedFrom', '>', now);
        query.orWhere('publishedTo', '<', now);
      });
    } else {
      query.where((query) => {
        query.where('publishedFrom', 'not-exists');
        query.orWhere('publishedFrom', '<=', now);
      });
      query.where((query) => {
        query.where('publishedTo', 'not-exists');
        query.orWhere('publishedTo', '>=', now);
      });
    }
  }

  if (id !== undefined) {
    query.where('objectId', 'in', id);
  }

  let articles: Article[] = [];
  let totalCount = 0;
  if (ctx.query.count) {
    [articles, totalCount] = await query.findAndCount({ useMasterKey: true });
    ctx.set('X-Total-Count', totalCount.toString());
  } else {
    articles = await query.find({ useMasterKey: true });
  }

  ctx.body = articles.map((article) => new ArticleResponse(article));
});

const createBaseArticleSchema = yup.object({
  name: yup.string().required(),
  publishedFrom: yup.date(),
  publishedTo: yup.date(),
  language: localeSchemaForYup.required(),
  title: yup.string().required(),
  content: yup.string().required(),
});

// create new article
router.post('/', auth, adminOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const data = createBaseArticleSchema.validateSync(ctx.request.body);

  const article = await Article.create(
    {
      ACL: {},
      name: data.name,
      defaultLanguage: data.language,
      publishedFrom: data.publishedFrom,
      publishedTo: data.publishedTo,
    },
    { useMasterKey: true }
  );

  const translation = await ArticleTranslation.create(
    {
      ACL: {},
      title: data.title,
      language: data.language,
      content: data.content,
      contentHTML: htmlify(data.content),
      articleId: article.id,
    },
    { useMasterKey: true }
  );

  await translation.createRevision(currentUser, translation);

  ctx.body = new ArticleResponse(article);
});

router.param('id', async (id, ctx, next) => {
  const article = await articleService.getArticle(id);
  if (!article) {
    ctx.throw(404, 'Article not found');
  }
  ctx.state.article = article;
  return next();
});

// get translation of article :id based on use prefer
router.get('/:id', fetchPreferredTranslation, (ctx) => {
  ctx.body = new ArticleTranslationResponse(ctx.state.translation);
});

// get article :id
router.get('/:id/info', auth, adminOnly, (ctx) => {
  ctx.body = new ArticleResponse(ctx.state.article);
});

// get translations of article :id
router.get('/:id/translations', auth, adminOnly, async (ctx) => {
  const article = ctx.state.article as Article;

  const translations = await ArticleTranslation.queryBuilder()
    .where('article', '==', article.toPointer())
    .where('deletedAt', 'not-exists')
    .preload('revision')
    .find({ useMasterKey: true });

  ctx.body = translations.map((translation) => new ArticleTranslationAbstractResponse(translation));
});

// get a list of category which uses article :id
router.get('/:id/categories', auth, adminOnly, async (ctx) => {
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
});

// create translation for article :id
// TODO: prefer /:id/translations
router.post('/:id', auth, adminOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;

  const { language, title, content } = createArticleTranslationSchema.validateSync(
    ctx.request.body
  );

  const data: CreateData<ArticleTranslation> = {
    ACL: {},
    title,
    language,
    content,
    contentHTML: htmlify(content),
    articleId: article.id,
  };

  const translation = await ArticleTranslation.create(data, { useMasterKey: true });
  await translation.createRevision(currentUser, translation);

  await articleService.clearArticleTranslationCache(article.id, language);

  ctx.body = new ArticleTranslationResponse(translation);
});

const feedbackSchema = yup.object({
  type: yup.number().oneOf([FeedbackType.Upvote, FeedbackType.Downvote]).required(),
});

// add feedback for translation of user preferred language of article :id
router.post('/:id/feedback', auth, fetchPreferredTranslation, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const translation = ctx.state.translation as ArticleTranslation;

  const { type } = feedbackSchema.validateSync(ctx.request.body);

  await translation.feedback(type, currentUser);
  ctx.body = {};
});

const updateBaseArticleSchema = yup.object({
  name: yup.string(),
  defaultLanguage: yup.string(),
  publishedFrom: yup.date().nullable(),
  publishedTo: yup.date().nullable(),
});

// update article :id
router.patch('/:id', auth, adminOnly, async (ctx) => {
  const article = ctx.state.article as Article;
  const data = updateBaseArticleSchema.validateSync(ctx.request.body);

  const updatedArticle = await article.update(
    {
      name: data.name,
      publishedFrom: data.publishedFrom,
      publishedTo: data.publishedTo,
      defaultLanguage: data.defaultLanguage,
    },
    { useMasterKey: true }
  );

  await articleService.clearArticleCache(article.id);

  ctx.body = new ArticleResponse(updatedArticle);
});

// delete article :id
router.delete('/:id', auth, adminOnly, async (ctx) => {
  const article = ctx.state.article as Article;

  const translations = await ArticleTranslation.queryBuilder()
    .where('article', '==', article.toPointer())
    .where('deletedAt', 'not-exists')
    .limit(1000)
    .find({ useMasterKey: true });

  if (translations.length) {
    const deletedAt = new Date();
    await ArticleTranslation.updateSome(
      translations.map((t) => [t, { deletedAt }]),
      { useMasterKey: true }
    );
  }

  await article.delete({ useMasterKey: true });

  await articleService.clearAllArticleCache(article.id);

  ctx.body = {};
});

router.param('language', async (language, ctx, next) => {
  const article = ctx.state.article as Article;

  const translation = await articleService.getArticleTranslation(
    article.id,
    language.toLowerCase()
  );
  if (!translation) {
    ctx.throw(404, `language ${language} does not exist`);
  }

  ctx.state.translation = translation;

  return next();
});

// get :language translation of article :id
router.get('/:id/:language', (ctx) => {
  ctx.body = new ArticleTranslationResponse(ctx.state.translation);
});

const updateArticleTranslationSchema = yup.object({
  title: yup.string(),
  content: yup.string(),
  comment: yup.string(),
});

// update :language translation of article :id
router.patch('/:id/:language', auth, adminOnly, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const article = ctx.state.article as Article;
  const translation = ctx.state.translation as ArticleTranslation;

  const { title, content, comment } = updateArticleTranslationSchema.validateSync(ctx.request.body);

  const updateData: UpdateData<ArticleTranslation> = { title };

  if (content !== undefined) {
    updateData.content = content;
    updateData.contentHTML = htmlify(content);
  }

  let updatedTranslation: ArticleTranslation | undefined;
  if (!_.isEmpty(updateData)) {
    updatedTranslation = await translation.update(updateData, { useMasterKey: true });
    await translation.createRevision(currentUser, updatedTranslation, translation, comment);
    await articleService.clearArticleTranslationCache(article.id, translation.language);
  }

  ctx.body = new ArticleTranslationResponse(updatedTranslation || translation);
});

// delete :language translation of article :id
router.delete('/:id/:language', auth, adminOnly, async (ctx) => {
  const translation = ctx.state.translation as ArticleTranslation;
  const article = ctx.state.article as Article;

  if (article.defaultLanguage === translation.language) {
    ctx.throw(400, "can't delete default language");
    return;
  }

  await translation.delete({ useMasterKey: true });
  await articleService.clearArticleTranslationCache(translation.articleId, translation.language);
  ctx.body = {};
});

const getRevisionsSchema = yup.object({
  meta: yup.boolean(),
});

// get revision list of :language translation of article :id
router.get('/:id/:language/revisions', auth, adminOnly, pagination(100), async (ctx) => {
  const translation = ctx.state.translation as ArticleTranslation;
  const { meta } = getRevisionsSchema.validateSync(ctx.query);
  const { page, pageSize } = pagination.get(ctx);

  const query = ArticleRevision.queryBuilder()
    .where('FAQTranslation', '==', translation.toPointer())
    .orderBy('createdAt', 'desc')
    .paginate(page, pageSize)
    .preload('author');

  if (meta !== undefined) {
    query.where('meta', meta ? '==' : '!=', true);
  }

  const [revisions, totalCount] = await query.findAndCount({ useMasterKey: true });

  ctx.set('x-total-count', totalCount.toString());
  ctx.body = revisions.map((revision) => new ArticleRevisionListItemResponse(revision));
});

router.param('rid', async (rid, ctx, next) => {
  const revision = await ArticleRevision.find(rid, { useMasterKey: true });
  if (!revision) {
    ctx.throw(404, `Revision ${rid} does not exist`);
  }
  ctx.state.revision = revision;
  return next();
});

// get revision :rid
router.get('/:id/:language/revisions/:rid', auth, adminOnly, pagination(100), (ctx) => {
  ctx.body = new ArticleRevisionResponse(ctx.state.revision);
});

export default router;
