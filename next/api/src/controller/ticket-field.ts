import { Context } from 'koa';
import { z } from 'zod';
import { escape } from 'sqlstring';
import axios from 'axios';
import _ from 'lodash';

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
  FindModelOptionalPipe,
} from '@/common/pipe';
import { auth, adminOnly, staffOnly } from '@/middleware';
import { FIELD_TYPES, OPTION_TYPES, TicketField } from '@/model/TicketField';
import {
  TicketFieldResponse,
  TicketFieldStatsOptions,
  TicketFieldStatsResponse,
} from '@/response/ticket-field';
import { Status } from '@/model/Ticket';
import { Category } from '@/model/Category';
import { TicketForm } from '@/model/TicketForm';
import { localeSchema, matchLocale } from '@/utils/locale';
import { ILocale, Locales } from '@/common/http/handler/param/locale';

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
  pattern: z.string().optional(),
});

const updateDataSchema = z.object({
  title: z.string().optional(),
  defaultLocale: localeSchema.optional(),
  meta: z.record(z.any()).optional().nullable(),
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  variants: variantsSchema.optional(),
  pattern: z.string().optional(),
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
    @Query('unused', ParseBoolPipe) unused?: boolean,
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

    if (unused) {
      return await Promise.all(
        fields.map(async (field) => {
          const isUnused = !(await TicketForm.queryBuilder()
            .where('fieldIds', '==', field.id)
            .first({ useMasterKey: true }));

          field.unused = isUnused;

          return field;
        })
      );
    }

    return fields;
  }

  @Post()
  @UseMiddlewares(adminOnly)
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
        pattern: data.type === 'text' ? data.pattern : undefined,
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
  @UseMiddlewares(staffOnly)
  async count(
    @Locales() locales: ILocale,
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
      : await TicketField.queryBuilder()
          .where('type', 'in', OPTION_TYPES)
          .orderBy('createdAt', 'asc')
          .limit(pageSize)
          .skip(page - 1)
          .find({ useMasterKey: true });

    if (!optionFields || optionFields.length === 0) {
      return [];
    }

    const optionIdMap = new Map(
      (
        await Promise.all(
          optionFields.map(async (field) => {
            const variants = await field.load('variants', { useMasterKey: true });

            if (!variants || !OPTION_TYPES.includes(field.type)) return undefined;

            const valueTitleMap = new Map(
              _(variants)
                .flatMap((v) => v.options?.map((o) => [o, v] as const) ?? [])
                .groupBy(([o]) => o.value)
                .mapValues((ovPairs) =>
                  matchLocale(ovPairs, ([, v]) => v.locale, locales.matcher, field.defaultLocale)
                )
                .values()
                .compact()
                .map(([o, v]) => [o.value, [o.title, v.locale] as const] as const)
                .value()
            );

            return [
              field.id,
              { title: field.title, type: field.type, map: valueTitleMap },
            ] as const;
          }, [])
        )
      ).filter(<T>(item: T | undefined): item is T => !!item)
    );

    const getSql = (categoryId?: string) => `
          WITH [${OPTION_TYPES.map((type) => escape(type)).join(', ')}] AS optionTypes
          SELECT
              count(DISTINCT t.objectId) AS count,
              t.status AS status,
              v.value AS value,
              c.fieldId AS fieldId
          FROM Ticket AS t
          INNER JOIN (
              SELECT
                  fieldV.\`ticket.objectId\` AS ticketId,
                  fieldValue,
                  arrayJoin(
                      if(JSONExtractString(fieldValue, 'value') != '',
                      array(JSONExtractString(fieldValue, 'value')),
                      JSONExtract(fieldValue, 'value', 'Array(String)'))) AS value,
                  visitParamExtractString(fieldValue, 'field') AS fieldId
              FROM TicketFieldValue AS fieldV
              ARRAY JOIN fieldV.values AS fieldValue
              INNER JOIN (
                  SELECT objectId, type, createdAt
                  FROM TicketField
                  WHERE arrayExists(x -> x = type, optionTypes)
                  ${
                    category
                      ? ''
                      : `
                  ORDER BY createdAt ASC
                  LIMIT ${escape(pageSize)}
                  OFFSET ${escape(pageSize * (page - 1))}
                  `
                  }
              ) AS tf
              ON tf.objectId = fieldId
          ) AS v
          ON t.objectId = v.ticketId
          INNER JOIN (
              SELECT trim(BOTH '"' FROM fieldIds) AS fieldId, c.objectId AS categoryId
              FROM TicketForm AS tf
              ARRAY JOIN tf.fieldIds
              INNER JOIN Category AS c
              ON c.\`form.objectId\` = tf.objectId
          ) AS c
          ON c.categoryId = visitParamExtractString(t.category, 'objectId')
          WHERE v.fieldId = c.fieldId
          ${
            categoryId
              ? `AND visitParamExtractString(t.category, 'objectId') = ${escape(categoryId)}`
              : ''
          }
          ${from ? `AND t.createdAt >= parseDateTimeBestEffortOrNull(${escape(from)})` : ''}
          ${to ? `AND t.createdAt <= parseDateTimeBestEffortOrNull(${escape(to)})` : ''}
          GROUP BY c.fieldId, t.status, v.value
        `;

    const optionStats = await axios.get<{
      results: { count: string; status: number; value: string; fieldId: string }[];
    }>(`${process.env.LC_API_SERVER as string}/datalake/v1/query`, {
      params: {
        sql: getSql(category?.id),
        limit: 1000,
      },
      headers: {
        'X-LC-ID': process.env.LC_APP_ID as string,
        'X-LC-Key': (process.env.LC_APP_MASTER_KEY as string) + ',master',
      },
    });

    return [
      ...Object.entries(_.groupBy(optionStats.data.results, (stats) => stats.fieldId))
        .map(
          ([fieldId, options]) =>
            [fieldId, Object.entries(_.groupBy(options, (option) => option.value))] as const
        )
        // process each field group
        .reduce<TicketFieldStatsResponse>((acc, [fieldId, options]) => {
          const field = optionIdMap.get(fieldId);

          if (!field) return acc;

          const processed = options // process each options group
            .reduce<TicketFieldStatsOptions[]>((acc, [value, optionValues]) => {
              const valueTitleInfo = field.map.get(value);

              if (!valueTitleInfo) return acc;

              const [title, locale] = valueTitleInfo;

              const counts = optionValues.reduce<TicketFieldStatsOptions['count']>(
                (acc, { count, status }) =>
                  Status.isOpen(status)
                    ? {
                        ...acc,
                        open: acc.open + Number(count),
                        total: acc.total + Number(count),
                      }
                    : {
                        ...acc,
                        closed: acc.closed + Number(count),
                        total: acc.total + Number(count),
                      },
                { open: 0, closed: 0, total: 0 }
              );

              field.map.delete(value);

              return [
                ...acc,
                {
                  title,
                  displayLocale: locale,
                  value,
                  count: counts,
                },
              ];
            }, []);

          optionIdMap.delete(fieldId);

          return [
            ...acc,
            {
              id: fieldId,
              title: field.title,
              type: field.type,
              options: [
                ...processed,
                // options which have never been selected
                ...[...field.map.entries()].map<TicketFieldStatsOptions>(
                  ([value, [title, locale]]) => ({
                    title,
                    displayLocale: locale,
                    value,
                    count: { open: 0, closed: 0, total: 0 },
                  })
                ),
              ].sort(
                (
                  { value: valueA, count: { total: countA } },
                  { value: valueB, count: { total: countB } }
                ) =>
                  countB !== countA
                    ? countB - countA
                    : valueA < valueB
                    ? -1
                    : valueA === valueB
                    ? 0
                    : 1
              ),
            },
          ];
        }, []),
      // fields that have never been select
      ...[...optionIdMap.entries()].map(([fieldId, { title, type, map }]) => ({
        id: fieldId,
        type,
        title,
        options: [...map.entries()].map(([value, [title, locale]]) => ({
          title,
          value,
          displayLocale: locale,
          count: {
            open: 0,
            closed: 0,
            total: 0,
          },
        })),
      })),
    ].sort(({ title: titleA }, { title: titleB }) =>
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
  @UseMiddlewares(adminOnly)
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
        pattern: field.type === 'text' ? data.pattern : undefined,
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
