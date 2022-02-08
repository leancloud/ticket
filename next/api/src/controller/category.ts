import { Context } from 'koa';

import {
  Controller,
  Ctx,
  Get,
  HttpError,
  Param,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { ParseBoolPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { getPublicArticle } from '@/model/Article';
import { Category } from '@/model/Category';
import { TicketForm } from '@/model/TicketForm';
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

@Controller('categories')
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

  @Get('groups')
  @UseMiddlewares(auth, customerServiceOnly)
  async findGroups() {
    const categories = await CategoryService.getAll();
    return categories
      .filter((c) => c.groupId)
      .map((c) => ({
        id: c.groupId,
        categoryId: c.id,
      }));
  }

  @Get(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(CategoryResponseForCS)
  findOne(@Param('id', FindCategoryPipe) category: Category) {
    return category;
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

  private getPreferedLocale(ctx: Context): string {
    if (ctx.query.locale && typeof ctx.query.locale === 'string') {
      return ctx.query.locale;
    }
    return ctx.get('accept-language')?.toLowerCase() || 'en';
  }
}
