import { Context } from 'koa';
import { z } from 'zod';
import { escape } from 'sqlstring';
import axios from 'axios';

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
  InternalServerError,
} from '@/common/http';
import {
  ParseBoolPipe,
  ParseIntPipe,
  ParseOrderPipe,
  ZodValidationPipe,
  Order,
  FindModelPipe,
  FindModelOptionalPipe,
} from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { FIELD_TYPES, OPTION_TYPES, TicketField } from '@/model/TicketField';
import { TicketFieldResponse, TicketFieldStatsResponse } from '@/response/ticket-field';
import { LOCALES } from '@/i18n/locales';
import { Status } from '@/model/Ticket';
import { Category } from '@/model/Category';

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
  meta: z.record(z.any()).optional(),
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  variants: variantsSchema,
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  defaultLocale: localeSchema.optional(),
  meta: z.record(z.any()).optional().nullable(),
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
        meta: data.meta,
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

  @Get('count')
  @UseMiddlewares(customerServiceOnly)
  async count(
    @Ctx() ctx: Context,
    @Query('categoryId', new FindModelOptionalPipe(Category, { useMasterKey: true }))
    category?: Category,
    @Query('fieldId', new FindModelOptionalPipe(TicketField, { useMasterKey: true }))
    field?: TicketField,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('pageSize', new ParseIntPipe({ min: 0, max: 1000 })) pageSize = 100,
    @Query('page', new ParseIntPipe({ min: 1 })) page = 1
  ) {
    const optionFields = field
      ? [field]
      : category
      ? await (await category?.load('form', { useMasterKey: true }))?.load('fields', {
          useMasterKey: true,
        })
      : await this.findAll(ctx, false, undefined, undefined, page, pageSize);

    if (!optionFields || optionFields.length === 0) {
      return [];
    }

    const localesMap = new Map(ctx.locales?.map((locale, index) => [locale, index + 1]));

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
                const optionInStore = pre.get(option.value);

                if (optionInStore) {
                  const [, locale] = optionInStore;
                  const curOptionPriority = localesMap.get(variant.locale);
                  const optionInStorePriority = localesMap.get(locale);

                  if (
                    // override if cur option has priority but stored is not
                    (!optionInStorePriority && curOptionPriority) ||
                    // override if cur option has higher priority
                    (curOptionPriority &&
                      optionInStorePriority &&
                      curOptionPriority < optionInStorePriority) ||
                    // override if stored option has no priority and cur option's locale is default
                    (!optionInStorePriority && variant.locale === optionField.defaultLocale)
                  ) {
                    pre.set(option.value, [option.title, variant.locale]);
                  }

                  return;
                }

                pre.set(option.value, [option.title, variant.locale]);
              });
              return pre;
            }, new Map()),
          ];

          const getSql = (fieldId: string, fieldValue: string, categoryId?: string) => `
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
            ${
              (categoryId &&
                `AND visitParamExtractString(t.category, 'objectId') = ${escape(categoryId)}`) ||
              ''
            }
            ${(from && `AND t.createdAt >= parseDateTimeBestEffortOrNull(${escape(from)})`) || ''}
            ${(to && `AND t.createdAt <= parseDateTimeBestEffortOrNull(${escape(to)})`) || ''}
            GROUP BY t.status
          `;

          const options = await Promise.all(
            fieldValues.map(async ([fieldValue, [fieldTitle, titleLocale]]) => {
              const res = await axios.get<{
                results: { count: number; status: number }[];
              }>(`${process.env.LC_API_SERVER as string}/datalake/v1/query`, {
                params: { sql: getSql(optionField.id, fieldValue, category?.id) },
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
                          closed: acc.closed + Number(count),
                          total: acc.total + Number(count),
                        },
                  { open: 0, closed: 0, total: 0 }
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
      .reduce<TicketFieldStatsResponse>((acc, field) => {
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
        meta: data.meta,
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
