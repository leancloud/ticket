import { Context } from 'koa';
import { z } from 'zod';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  HttpError,
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
import { ArticleResponse } from '@/response/article';
import { CategoryService } from '@/service/category';
import {
  CategoryResponse,
  CategoryFieldResponse,
  CategoryResponseForCS,
} from '@/response/category';

class FindCategoryPipe {
  static async transform(id: string): Promise<Category> {
    const category = await CategoryService.get(id);
    if (!category) {
      throw new HttpError(404, `Category ${id} is not exist`);
    }
    return category;
  }
}

const createCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  alias: z.string().optional(),
  parentId: z.string().optional(),
  noticeIds: z.array(z.string()).optional(),
  articleIds: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  formId: z.string().optional(),
  template: z.string().optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  position: z.number().optional(),
  active: z.boolean().optional(),
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
  async findAll(@Query('active', new ParseBoolPipe({ keepUndefined: true })) active?: boolean) {
    const categories = await CategoryService.getAll();
    if (active !== undefined) {
      return active
        ? categories.filter((c) => c.deletedAt === undefined)
        : categories.filter((c) => c.deletedAt !== undefined);
    }
    return categories;
  }

  @Post('batch-update')
  @UseMiddlewares(auth, customerServiceOnly)
  async batchUpdate(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(batchUpdateSchema)) datas: BatchUpdateData
  ) {
    await CategoryService.batchUpdate(
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
    const category = await CategoryService.create(
      {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        FAQIds: data.articleIds?.length === 0 ? undefined : data.articleIds,
        noticeIds: data.noticeIds?.length === 0 ? undefined : data.noticeIds,
        groupId: data.groupId,
        formId: data.formId,
        qTemplate: data.template,
      },
      currentUser.getAuthOptions()
    );

    return {
      id: category.id,
    };
  }

  @Get(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(CategoryResponseForCS)
  findOne(@Param('id', FindCategoryPipe) category: Category) {
    return category;
  }

  @Patch(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  async update(
    @CurrentUser() currentUser: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) data: CreateCategoryData
  ) {
    await CategoryService.batchUpdate(
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

    const locale = this.getPreferedLocale(ctx);
    return form.getFieldVariants(locale);
  }

  @Get(':id/faqs')
  @ResponseBody(ArticleResponse)
  async getFAQs(@Param('id', FindCategoryPipe) category: Category) {
    if (!category.FAQIds) {
      return [];
    }

    const articles = await Promise.all(category.FAQIds.map(getPublicArticle));
    return articles.filter((article) => article && !article.private);
  }

  @Get(':id/notices')
  @ResponseBody(ArticleResponse)
  async getNotices(@Param('id', FindCategoryPipe) category: Category) {
    if (!category.noticeIds) {
      return [];
    }

    const articles = await Promise.all(category.noticeIds.map(getPublicArticle));
    return articles.filter((article) => article && !article.private);
  }

  @Get(':id/categories')
  @ResponseBody(CategoryResponse)
  async getSubCategories(
    @Param('id', FindCategoryPipe) category: Category,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active?: boolean
  ) {
    const categories = await CategoryService.getSubCategories(category.id);
    if (active !== undefined) {
      return active
        ? categories.filter((c) => c.deletedAt === undefined)
        : categories.filter((c) => c.deletedAt !== undefined);
    }
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
      alias: data.alias,
      parentId: data.parentId,
      noticeIds: data.noticeIds?.length === 0 ? null : data.noticeIds,
      FAQIds: data.articleIds?.length === 0 ? null : data.articleIds,
      groupId: data.groupId,
      formId: data.formId,
      qTemplate: data.template,
      order: data.position ?? deletedAt?.getTime(),
      deletedAt,
    };
  }

  private getPreferedLocale(ctx: Context): string {
    if (ctx.query.locale && typeof ctx.query.locale === 'string') {
      return ctx.query.locale;
    }
    return ctx.get('accept-language')?.toLowerCase() || 'en';
  }
}
