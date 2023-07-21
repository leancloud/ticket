import { Context } from 'koa';
import { z } from 'zod';
import _ from 'lodash';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe, ZodValidationPipe } from '@/common/pipe';
import { UpdateData } from '@/orm';
import { auth, adminOnly } from '@/middleware';
import { Category } from '@/model/Category';
import { TicketForm } from '@/model/TicketForm';
import { User } from '@/model/User';
import { ArticleTranslationResponse } from '@/response/article';
import { CategoryResponse } from '@/response/category';
import { TicketFieldVariantResponse } from '@/response/ticket-field';
import { ArticleTopicFullResponse } from '@/response/article-topic';
import { getTopic } from '@/model/ArticleTopic';
import { FindCategoryPipe, categoryService } from '@/category';
import { ILocale, Locales } from '@/common/http/handler/param/locale';
import { getPublishedArticleTranslations } from '@/model/ArticleTranslation';
import { dynamicContentService } from '@/dynamic-content';

const createCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  alias: z.string().optional(),
  parentId: z.string().optional(),
  noticeIds: z.array(z.string()).optional(),
  articleIds: z.array(z.string()).optional(),
  topicIds: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  formId: z.string().optional(),
  meta: z.record(z.any()).optional(),
  template: z.string().optional(),
  hidden: z.boolean().optional(),
  articleId: z.string().optional(),
  isTicketEnabled: z.boolean().optional(),
  ticketDescription: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  position: z.number().optional(),
  active: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  formId: z.string().nullable().optional(),
  meta: z.record(z.any()).optional().nullable(),
  articleId: z.string().nullable().optional(),
  ticketDescription: z.string().nullable().optional(),
});

const batchUpdateSchema = z.array(
  updateCategorySchema.extend({
    id: z.string(),
  })
);

const classifySchema = z.object({
  productId: z.string(),
  content: z.string(),
});

type CreateCategoryData = z.infer<typeof createCategorySchema>;

type UpdateCategoryData = z.infer<typeof updateCategorySchema>;

type BatchUpdateData = z.infer<typeof batchUpdateSchema>;

type ClassifyData = z.infer<typeof classifySchema>;

@Controller(['categories', 'products'])
export class CategoryController {
  @Get()
  @ResponseBody(CategoryResponse)
  async findAll(
    @Ctx() ctx: Context,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active: boolean | undefined
  ) {
    const categories = await categoryService.find({ active });
    await categoryService.renderCategories(categories, ctx.locales.locales);

    return categories;
  }

  @Post('classify')
  async classify(
    @Body(new ZodValidationPipe(classifySchema)) data: ClassifyData,
    @Locales() locale: ILocale
  ) {
    const category = await categoryService.classifyTicketWithAI(data.productId, data.content);

    category && (await categoryService.renderCategories([category], locale.locales));

    return category ? { status: 'success', data: category } : { status: 'failed' };
  }

  @Post('batch-update')
  @UseMiddlewares(auth, adminOnly)
  async batchUpdate(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(batchUpdateSchema)) datas: BatchUpdateData
  ) {
    await categoryService.batchUpdate(
      datas.map((data) => ({ ...this.convertUpdateData(data), id: data.id })),
      currentUser.getAuthOptions()
    );
    return {};
  }

  @Post()
  @UseMiddlewares(auth, adminOnly)
  async create(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(createCategorySchema)) data: CreateCategoryData
  ) {
    const category = await categoryService.create(
      {
        name: data.name,
        description: data.description,
        alias: data.alias,
        parentId: data.parentId,
        FAQIds: data.articleIds?.length === 0 ? undefined : data.articleIds,
        noticeIds: data.noticeIds?.length === 0 ? undefined : data.noticeIds,
        topicIds: data.topicIds?.length === 0 ? undefined : data.topicIds,
        groupId: data.groupId,
        formId: data.formId,
        qTemplate: data.template,
        isTicketEnabled: data.isTicketEnabled,
        meta: data.meta,
        hidden: data.hidden,
      },
      currentUser.getAuthOptions()
    );

    return {
      id: category.id,
    };
  }

  @Get(':id')
  @ResponseBody(CategoryResponse)
  async findOne(@Ctx() ctx: Context, @Param('id', FindCategoryPipe) category: Category) {
    await categoryService.renderCategories([category], ctx.locales.locales);
    return category;
  }

  @Patch(':id')
  @UseMiddlewares(auth, adminOnly)
  async update(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) data: CreateCategoryData
  ) {
    await categoryService.batchUpdate(
      [{ ...this.convertUpdateData(data), id }],
      currentUser.getAuthOptions()
    );
    return {};
  }

  @Get(':id/fields')
  @ResponseBody(TicketFieldVariantResponse)
  async getFields(@Param('id', FindCategoryPipe) category: Category, @Locales() locales: ILocale) {
    if (!category.formId) {
      return [];
    }

    const form = await TicketForm.find(category.formId, { useMasterKey: true });
    if (!form) {
      return [];
    }

    return form.getFieldVariants(locales.matcher);
  }

  @Get(':id/faqs')
  @ResponseBody(ArticleTranslationResponse)
  getFAQs(@Param('id', FindCategoryPipe) category: Category, @Locales() locales: ILocale) {
    if (!category.FAQIds) {
      return [];
    }
    return getPublishedArticleTranslations(category.FAQIds, locales.matcher);
  }

  @Get(':id/notices')
  @ResponseBody(ArticleTranslationResponse)
  getNotices(@Param('id', FindCategoryPipe) category: Category, @Locales() locales: ILocale) {
    if (!category.noticeIds) {
      return [];
    }
    return getPublishedArticleTranslations(category.noticeIds, locales.matcher);
  }

  @Get(':id/topics')
  @ResponseBody(ArticleTopicFullResponse)
  async getTopics(@Param('id', FindCategoryPipe) category: Category, @Locales() locales: ILocale) {
    if (!category.topicIds || category.topicIds.length === 0) {
      return [];
    }

    const topics = _.compact(
      await Promise.all(category.topicIds.map((topicId) => getTopic(topicId, locales.matcher)))
    );
    await dynamicContentService.renderObjects(topics, ['name'], locales.locales);
    return topics;
  }

  @Get(':id/categories')
  @ResponseBody(CategoryResponse)
  async getSubCategories(
    @Ctx() ctx: Context,
    @Param('id', FindCategoryPipe) category: Category,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active?: boolean
  ) {
    const categories = await categoryService.getSubCategories(category.id, active);
    await categoryService.renderCategories(categories, ctx.locales.locales);
    return categories;
  }

  private convertUpdateData(data: UpdateCategoryData): UpdateData<Category> {
    let deletedAt: Date | null | undefined = undefined;
    if (data.active !== undefined) {
      if (data.active) {
        deletedAt = null;
      } else {
        deletedAt = new Date();
      }
    }

    return {
      name: data.name,
      description: data.description,
      alias: data.alias === '' ? null : data.alias,
      parentId: data.parentId,
      noticeIds: data.noticeIds?.length === 0 ? null : data.noticeIds,
      FAQIds: data.articleIds?.length === 0 ? null : data.articleIds,
      topicIds: data.topicIds?.length === 0 ? null : data.topicIds,
      groupId: data.groupId,
      formId: data.formId,
      qTemplate: data.template,
      meta: data.meta,
      order: data.position ?? deletedAt?.getTime(),
      deletedAt,
      hidden: data.hidden,
      articleId: data.articleId,
      isTicketEnabled: data.isTicketEnabled,
      ticketDescription: data.ticketDescription,
    };
  }
}
