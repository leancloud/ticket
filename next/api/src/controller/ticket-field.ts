import { Context } from 'koa';
import { z } from 'zod';

import {
  Controller,
  Get,
  Post,
  Query,
  UseMiddlewares,
  Ctx,
  Body,
  HttpError,
  StatusCode,
  Param,
  Patch,
  ResponseBody,
} from '@/common/http';
import {
  ParseBoolPipe,
  ParseIntPipe,
  ParseOrderPipe,
  ZodValidationPipe,
  Order,
  FindModelPipe,
} from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { FIELD_TYPES, OPTION_TYPES, TicketField } from '@/model/TicketField';
import { TicketFieldResponse } from '@/response/ticket-field';
import { LOCALES } from '@/i18n/locales';

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

const variantOptionSchema = z.object({
  title: z.string(),
  value: z.string(),
});

const variantSchema = z.object({
  locale: localeSchema,
  title: z.string(),
  titleForCustomerService: z.string(),
  description: z.string().optional(),
  options: z.array(variantOptionSchema).optional(),
});

const variantsSchema = z.array(variantSchema).min(1);

const createDataSchema = z.object({
  type: z.enum(FIELD_TYPES),
  title: z.string(),
  defaultLocale: localeSchema,
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  variants: variantsSchema,
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  defaultLocale: localeSchema.optional(),
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  variants: variantsSchema.optional(),
});

type CreateData = z.infer<typeof createDataSchema>;

type UpdateData = z.infer<typeof updateDataSchema>;

@Controller('ticket-fields')
@UseMiddlewares(auth)
export class TicketFieldController {
  @Get()
  @ResponseBody(TicketFieldResponse)
  async findAll(
    @Ctx() ctx: Context,
    @Query('includeVariants', ParseBoolPipe) includeVariants: boolean,
    @Query('active', new ParseBoolPipe({ keepUndefined: true })) active?: boolean,
    @Query('orderBy', new ParseOrderPipe(['createdAt', 'updatedAt'])) orderBy?: Order[],
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 10,
    @Query('count', ParseBoolPipe) count?: boolean
  ) {
    const query = TicketField.queryBuilder()
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (includeVariants) {
      query.preload('variants', {
        onQuery: (query) => {
          query.limit(1000).orderBy('createdAt', 'asc');
        },
      });
    }

    if (active !== undefined) {
      query.where('active', '==', active);
    }

    orderBy?.forEach(({ key, order }) => query.orderBy(key, order));

    const fields = count
      ? await query.findAndCount({ useMasterKey: true }).then(([fields, count]) => {
          ctx.set('X-Total-Count', count.toString());
          return fields;
        })
      : await query.find({ useMasterKey: true });

    return fields;
  }

  @Post()
  @UseMiddlewares(customerServiceOnly)
  @StatusCode(201)
  async create(@Body(new ZodValidationPipe(createDataSchema)) data: CreateData) {
    if (OPTION_TYPES.includes(data.type)) {
      this.assertAllVariantsHasOptions(data.variants);
    } else {
      data.variants.forEach((variant) => delete variant.options);
    }

    const locales = data.variants.map((variant) => variant.locale);
    this.assertNoDuplicatedLocale(locales);
    this.assertHasDefaultLocale(data.defaultLocale, locales);

    const field = await TicketField.create(
      {
        ACL: {},
        active: true,
        type: data.type,
        title: data.title,
        defaultLocale: data.defaultLocale,
        visible: data.visible ?? true,
        required: data.required ?? false,
      },
      { useMasterKey: true }
    );
    await field.appendVariants(data.variants);

    return {
      id: field.id,
    };
  }

  @Get(':id')
  async find(
    @Param('id', new FindModelPipe(TicketField, { useMasterKey: true })) field: TicketField
  ) {
    const variants = await field.getVariants();
    return new TicketFieldResponse(field, variants);
  }

  @Patch(':id')
  @UseMiddlewares(customerServiceOnly)
  async update(
    @Param('id', new FindModelPipe(TicketField, { useMasterKey: true })) field: TicketField,
    @Body(new ZodValidationPipe(updateDataSchema)) data: UpdateData
  ) {
    if (data.defaultLocale) {
      const variants = data.variants ?? (await field.getVariants());
      const locales = variants.map((variant) => variant.locale);
      this.assertHasDefaultLocale(data.defaultLocale, locales);
    }

    if (data.variants) {
      if (OPTION_TYPES.includes(field.type)) {
        this.assertAllVariantsHasOptions(data.variants);
      }

      const locales = data.variants.map((variant) => variant.locale);
      const defaultLocale = data.defaultLocale ?? field.defaultLocale;
      this.assertHasDefaultLocale(defaultLocale, locales);

      await field.replaceVariants(data.variants);
    }

    await field.update(
      {
        title: data.title,
        defaultLocale: data.defaultLocale,
        visible: data.visible,
        required: data.required,
        active: data.active,
      },
      { useMasterKey: true }
    );

    return {};
  }

  assertAllVariantsHasOptions(variants: z.infer<typeof variantsSchema>) {
    const index = variants.findIndex((v) => v.options === undefined);
    if (index >= 0) {
      throw new HttpError(400, `body.variants.${index}.options: Required`);
    }
  }

  assertNoDuplicatedLocale(locales: string[]) {
    const set = new Set<string>();
    for (const locale of locales) {
      if (set.has(locale)) {
        throw new HttpError(400, `body.variants: locale "${locale}" is duplicated`);
      }
      set.add(locale);
    }
  }

  assertHasDefaultLocale(defaultLocale: string, locales: string[]) {
    if (!locales.includes(defaultLocale)) {
      throw new HttpError(400, `The defaultLocale "${defaultLocale}" is missing in variants`);
    }
  }
}
