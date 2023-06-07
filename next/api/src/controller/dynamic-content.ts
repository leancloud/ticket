import { z } from 'zod';
import AV from 'leancloud-storage';
import { Context } from 'koa';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Delete,
  Get,
  HttpError,
  Param,
  Patch,
  Post,
  Query,
  ResponseBody,
  StatusCode,
  UseMiddlewares,
} from '@/common/http';
import { LOCALES } from '@/i18n/locales';
import { FindModelPipe, ParseIntPipe, ZodValidationPipe } from '@/common/pipe';
import { User } from '@/model/User';
import { auth, adminOnly } from '@/middleware';
import { ACLBuilder, AuthOptions } from '@/orm';
import { DynamicContent } from '@/model/DynamicContent';
import { DynamicContentVariant } from '@/model/DynamicContentVariant';
import { DynamicContentResponse } from '@/response/dynamic-content';
import { DynamicContentVariantResponse } from '@/response/dynamic-content-variant';
import { dynamicContentService } from '@/dynamic-content/dynamic-content.service';

const dynamicContentNameSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

const localeSchema = z
  .string()
  .transform((s) => s.toLowerCase())
  .superRefine((s, ctx) => {
    if (!LOCALES.includes(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_enum_value,
        options: LOCALES,
      });
    }
  });

const variantSchema = z.object({
  locale: localeSchema,
  active: z.boolean().optional(),
  content: z.string().max(1000),
});

const createDynamicContentSchema = z.object({
  name: dynamicContentNameSchema,
  defaultLocale: localeSchema,
  content: z.string(),
});

const updateDynamicContentSchema = createDynamicContentSchema
  .omit({
    content: true,
  })
  .partial();

const updateVariantSchema = variantSchema
  .omit({
    locale: true,
  })
  .partial();

const renderSchema = z.object({
  content: z.string().max(1000),
});

type CreateDynamicContentData = z.infer<typeof createDynamicContentSchema>;

type UpdateDynamicContentData = z.infer<typeof updateDynamicContentSchema>;

type CreateVariantData = z.infer<typeof variantSchema>;

type UpdateVariantData = z.infer<typeof updateVariantSchema>;

type RenderData = z.infer<typeof renderSchema>;

@Controller('dynamic-contents')
@UseMiddlewares(auth, adminOnly)
export class DynamicContentController {
  @Post('/render')
  async render(
    @Ctx() ctx: Context,
    @Body(new ZodValidationPipe(renderSchema)) { content }: RenderData
  ) {
    const result = await dynamicContentService.render(content, ctx.locales.locales);
    return {
      content: result,
    };
  }

  @Post()
  @StatusCode(201)
  async create(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(createDynamicContentSchema)) data: CreateDynamicContentData
  ) {
    const authOptions = currentUser.getAuthOptions();
    await this.assertNoNameConflict(data.name, authOptions);

    const ACL = new ACLBuilder().allow('*', 'read').allowCustomerService('write');
    const dc = await DynamicContent.create(
      {
        ACL,
        name: data.name,
        defaultLocale: data.defaultLocale,
      },
      authOptions
    );
    await DynamicContentVariant.create(
      {
        ACL,
        dynamicContentId: dc.id,
        active: true,
        locale: data.defaultLocale,
        content: data.content,
      },
      authOptions
    );

    // 因为会往缓存里种空值, 所以创建完也要清理缓存
    await dynamicContentService.clearContentCache(dc.name);

    return {
      id: dc.id,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent,
    @Body(new ZodValidationPipe(updateDynamicContentSchema)) data: UpdateDynamicContentData
  ) {
    const contentNames = [dc.name];
    const authOptions = currentUser.getAuthOptions();
    if (data.name && data.name !== dc.name) {
      await this.assertNoNameConflict(data.name, authOptions);
      contentNames.push(data.name);
    }
    if (data.defaultLocale) {
      const dcv = await DynamicContentVariant.queryBuilder()
        .where('dynamicContent', '==', dc.toPointer())
        .where('locale', '==', data.defaultLocale)
        .first(authOptions);
      if (!dcv) {
        throw new HttpError(422, `variant with locale ${data.defaultLocale} does not exist`);
      }
      if (!dcv.active) {
        throw new HttpError(422, `variant ${dcv.locale} is inactive`);
      }
    }
    await dc.update(data, authOptions);
    await dynamicContentService.clearContentCache(contentNames);
    return {};
  }

  @Get()
  @ResponseBody(DynamicContentResponse)
  async find(
    @Ctx() ctx: Context,
    @CurrentUser() currentUser: User,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 100 })) pageSize = 10
  ) {
    const [dcs, count] = await DynamicContent.queryBuilder()
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .findAndCount(currentUser.getAuthOptions());

    ctx.set('x-total-count', count.toString());
    return dcs;
  }

  @Get(':id')
  @ResponseBody(DynamicContentResponse)
  findOne(@Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent) {
    return dc;
  }

  @Delete(':id')
  async delete(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent
  ) {
    const authOptions = currentUser.getAuthOptions();
    const variants = await DynamicContentVariant.queryBuilder()
      .where('dynamicContent', '==', dc.toPointer())
      .find(authOptions);
    const objects = [
      AV.Object.createWithoutData('DynamicContent', dc.id),
      ...variants.map(({ id }) => AV.Object.createWithoutData('DynamicContentVariant', id)),
    ];
    await AV.Object.destroyAll(objects, authOptions);
    await dynamicContentService.clearContentCache(dc.name);
    return {};
  }

  @Post(':id/variants')
  async createVariant(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent,
    @Body(new ZodValidationPipe(variantSchema)) data: CreateVariantData
  ) {
    const authOptions = currentUser.getAuthOptions();
    const sameLocaleVariant = await DynamicContentVariant.queryBuilder()
      .where('dynamicContent', '==', dc.toPointer())
      .where('locale', '==', data.locale)
      .first(authOptions);
    if (sameLocaleVariant) {
      throw new HttpError(409, `variant with locale "${data.locale}" already exists`);
    }

    const ACL = new ACLBuilder().allow('*', 'read').allowCustomerService('write');
    const variant = await DynamicContentVariant.create({
      ...data,
      ACL,
      dynamicContentId: dc.id,
      active: data.active ?? true,
    });

    await dynamicContentService.clearContentCache(dc.name);

    return {
      id: variant.id,
    };
  }

  @Get(':id/variants')
  @ResponseBody(DynamicContentVariantResponse)
  findVariants(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent
  ) {
    return DynamicContentVariant.queryBuilder()
      .where('dynamicContent', '==', dc.toPointer())
      .find(currentUser.getAuthOptions());
  }

  @Get(':id/variants/:vid')
  @ResponseBody(DynamicContentVariantResponse)
  findVariant(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent,
    @Param('vid') vid: string
  ) {
    return this.findVariantOrFail(dc.id, vid, currentUser.getAuthOptions());
  }

  @Patch(':id/variants/:vid')
  async updateVariant(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent,
    @Param('vid') vid: string,
    @Body(new ZodValidationPipe(updateVariantSchema)) data: UpdateVariantData
  ) {
    const authOptions = currentUser.getAuthOptions();
    const variant = await this.findVariantOrFail(dc.id, vid, authOptions);
    if (data.active === false && variant.locale === dc.defaultLocale) {
      throw new HttpError(400, 'cannot inactive default variant');
    }
    await variant.update(data, authOptions);
    await dynamicContentService.clearContentCache(dc.name);
    return {};
  }

  @Delete(':id/variants/:vid')
  async deleteVariant(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(DynamicContent)) dc: DynamicContent,
    @Param('vid') vid: string
  ) {
    const authOptions = currentUser.getAuthOptions();
    const variant = await this.findVariantOrFail(dc.id, vid, authOptions);
    if (variant.locale === dc.defaultLocale) {
      throw new HttpError(400, 'cannot delete default variant');
    }
    await variant.delete(authOptions);
    await dynamicContentService.clearContentCache(dc.name);
    return {};
  }

  private async assertNoNameConflict(name: string, options: AuthOptions) {
    const dc = await DynamicContent.queryBuilder().where('name', '==', name).first(options);
    if (dc) {
      throw new HttpError(409, `name ${name} already exists`);
    }
  }

  private async findVariantOrFail(dcId: string, variantId: string, options?: AuthOptions) {
    const variant = await DynamicContentVariant.queryBuilder()
      .where('dynamicContent', '==', DynamicContent.ptr(dcId))
      .where('objectId', '==', variantId)
      .first(options);
    if (!variant) {
      throw new HttpError(404, `variant ${variantId} does not exist`);
    }
    return variant;
  }
}
