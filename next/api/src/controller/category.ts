import { Context } from 'koa';
import { z } from 'zod';
import axios from 'axios';
import { escape } from 'sqlstring';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  InternalServerError,
  Param,
  Patch,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe, ZodValidationPipe } from '@/common/pipe';
import { UpdateData } from '@/orm';
import { auth, customerServiceOnly } from '@/middleware';
import { getPublicArticle } from '@/model/Article';
import { Category } from '@/model/Category';
import { TicketForm } from '@/model/TicketForm';
import { User } from '@/model/User';
import { ArticleAbstractResponse } from '@/response/article';
import { CategoryFieldStatsResponse, CategoryResponse } from '@/response/category';
import { CategoryFieldResponse } from '@/response/ticket-field';
import { ArticleTopicFullResponse } from '@/response/article-topic';
import { getTopic } from '@/model/ArticleTopic';
import _ from 'lodash';
import { OPTION_TYPES } from '@/model/TicketField';
import { Status } from '@/model/Ticket';
import { FindCategoryPipe, categoryService } from '@/category';

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
});

const updateCategorySchema = createCategorySchema.partial().extend({
  position: z.number().optional(),
  active: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  formId: z.string().nullable().optional(),
  meta: z.record(z.any()).optional().nullable(),
});

const batchUpdateSchema = z.array(
  updateCategorySchema.extend({
    id: z.string(),
  })
);

type CreateCategoryData = z.infer<typeof createCategorySchema>;

type UpdateCategoryData = z.infer<typeof updateCategorySchema>;

type BatchUpdateData = z.infer<typeof batchUpdateSchema>;

@Controller(['categories', 'products'])
export class CategoryController {
  @Get()
  @ResponseBody(CategoryResponse)
  async findAll(
    @Ctx() ctx: Context,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active: boolean | undefined
  ) {
    const categories = await categoryService.find({ active });
    await categoryService.renderCategories(categories, ctx.locales);
    return categories;
  }

  @Post('batch-update')
  @UseMiddlewares(auth, customerServiceOnly)
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
  @UseMiddlewares(auth, customerServiceOnly)
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
        meta: data.meta,
      },
      currentUser.getAuthOptions()
    );

    return {
      id: category.id,
    };
  }

  @Get(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(CategoryResponse)
  async findOne(@Ctx() ctx: Context, @Param('id', FindCategoryPipe) category: Category) {
    await categoryService.renderCategories([category], ctx.locales);
    return category;
  }

  @Patch(':id')
  @UseMiddlewares(auth, customerServiceOnly)
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
  @ResponseBody(CategoryFieldResponse)
  async getFields(@Ctx() ctx: Context, @Param('id', FindCategoryPipe) category: Category) {
    if (!category.formId) {
      return [];
    }

    const form = await TicketForm.find(category.formId, { useMasterKey: true });
    if (!form) {
      return [];
    }

    const locale = ctx.locales?.[0] ?? 'en';
    return form.getFieldVariants(locale);
  }

  @Get(':id/faqs')
  @ResponseBody(ArticleAbstractResponse)
  async getFAQs(@Param('id', FindCategoryPipe) category: Category) {
    if (!category.FAQIds) {
      return [];
    }

    const articles = _.compact(await Promise.all(category.FAQIds.map(getPublicArticle)));
    return articles;
  }

  @Get(':id/notices')
  @ResponseBody(ArticleAbstractResponse)
  async getNotices(@Param('id', FindCategoryPipe) category: Category) {
    if (!category.noticeIds) {
      return [];
    }

    const articles = _.compact(await Promise.all(category.noticeIds.map(getPublicArticle)));
    return articles;
  }

  @Get(':id/topics')
  @ResponseBody(ArticleTopicFullResponse)
  async getTopics(@Param('id', FindCategoryPipe) category: Category) {
    if (!category.topicIds) {
      return [];
    }

    const topics = await Promise.all(category.topicIds.map(getTopic));
    return topics;
  }

  @Get(':id/categories')
  @ResponseBody(CategoryResponse)
  async getSubCategories(
    @Param('id', FindCategoryPipe) category: Category,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active?: boolean
  ) {
    return await categoryService.getSubCategories(category.id, active);
  }

  @Get('count/:id')
  @UseMiddlewares(auth, customerServiceOnly)
  async getFieldCounts(
    @Param('id', FindCategoryPipe) category: Category,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const optionFields = await (await category.load('form', { useMasterKey: true }))?.load(
      'fields',
      { useMasterKey: true }
    );

    if (!optionFields) {
      return [];
    }

    const skipSerialize = Symbol('skipSerialize');

    return (
      await Promise.allSettled(
        optionFields.map(async (optionField) => {
          const variants = await optionField.load('variants', { useMasterKey: true });

          // skip process if variant is not option type or doesn't exist
          if (!variants || !OPTION_TYPES.includes(optionField.type)) {
            return Promise.reject(skipSerialize);
          }

          const fieldValues = [
            ...variants.reduce<Map<string, [string, string]>>((pre, variant) => {
              variant.options?.forEach((option) => {
                // TODO: use `getPreferedLocale` instead?
                if (pre.has(option.value)) {
                  if (variant.locale === optionField.defaultLocale) {
                    pre.set(option.value, [option.title, variant.locale]);
                  }
                  return;
                }
                pre.set(option.value, [option.title, variant.locale]);
              });
              return pre;
            }, new Map()),
          ];

          const getSql = (fieldId: string, fieldValue: string, categoryId: string) => `
            SELECT count(t.objectId) AS count, t.status
            FROM Ticket AS t
            LEFT JOIN TicketFieldValue AS v
            ON t.objectId = v.\`ticket.objectId\`
            WHERE arrayExists(
                x -> visitParamExtractString(x, 'field') = ${escape(fieldId)}
                AND (
                    visitParamExtractString(x, 'value') = ${escape(fieldValue)}
                    OR
                    arrayExists(x -> x = ${escape(
                      fieldValue
                    )}, JSONExtract(x, 'value', 'Array(String)'))
                ),
                v.values
            )
            AND
            visitParamExtractString(t.category, 'objectId') = ${escape(categoryId)}
            ${(from && `AND t.createdAt >= parseDateTimeBestEffortOrNull(${escape(from)})`) || ''}
            ${(to && `AND t.createdAt <= parseDateTimeBestEffortOrNull(${escape(to)})`) || ''}
            GROUP BY t.status
          `;

          const options = await Promise.all(
            fieldValues.map(async ([fieldValue, [fieldTitle, titleLocale]]) => {
              const res = await axios.get<{
                results: { count: number; status: number }[];
              }>(`${process.env.LC_API_SERVER as string}/datalake/v1/query`, {
                params: { sql: getSql(optionField.id, fieldValue, category.id) },
                headers: {
                  'X-LC-ID': process.env.LC_APP_ID as string,
                  'X-LC-Key': (process.env.LC_APP_MASTER_KEY as string) + ',master',
                },
              });

              return {
                title: fieldTitle,
                displayLocale: titleLocale,
                value: fieldValue,
                count: res.data.results.reduce(
                  (acc, { count, status }) =>
                    Status.isOpen(status)
                      ? { ...acc, open: acc.open + Number(count), total: acc.total + Number(count) }
                      : {
                          ...acc,
                          close: acc.close + Number(count),
                          total: acc.total + Number(count),
                        },
                  { open: 0, close: 0, total: 0 }
                ),
              };
            }, [])
          );
          return {
            id: optionField.id,
            title: optionField.title,
            type: optionField.type,
            options: options.sort(
              ({ count: { total: totalA } }, { count: { total: totalB } }) => totalB - totalA
            ),
          };
        })
      )
    )
      .reduce<CategoryFieldStatsResponse>((acc, field) => {
        if (field.status === 'fulfilled') {
          return [...acc, field.value];
        }
        // remove skipped fields from this array
        if (field.reason !== skipSerialize) {
          throw new InternalServerError(field.reason as string);
        }
        return acc;
      }, [])
      .sort(({ title: titleA }, { title: titleB }) =>
        titleA < titleB ? -1 : titleA === titleB ? 0 : 1
      );
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
    };
  }
}
