import { Context } from 'koa';
import Router from '@koa/router';
import { z } from 'zod';
import _ from 'lodash';

import { auth, boolean, customerServiceOnly, pagination, sort } from '@/middleware';
import { FIELD_TYPES, OPTION_TYPES, TicketField } from '@/model/TicketField';
import { TicketFieldResponse } from '@/response/ticket-field';

const LOCALES = [
  'zh-cn',
  'zh-tw',
  'zh-hk',
  'en',
  'ja',
  'ko',
  'id',
  'th',
  'de',
  'fr',
  'ru',
  'es',
  'pt',
  'tr',
];

const router = new Router().use(auth);

function isValidLocale(locale: string): boolean {
  return LOCALES.includes(locale.toLowerCase());
}

const localeSchema = z.string().refine(isValidLocale, {
  message: 'Unknown locale',
});

function assertNoDuplicatedLocale(ctx: Context, locales: string[]) {
  const localeSet = new Set<string>();
  for (const locale of locales) {
    if (localeSet.has(locale)) {
      ctx.throw(400, `variants: locale "${locale}" is duplicated`);
    }
    localeSet.add(locale);
  }
}

function assertAllVariantsHasOptions(ctx: Context, variants: { options?: any[] }[]) {
  const index = variants.findIndex((v) => v.options === undefined);
  ctx.assert(index === -1, 400, `variants[${index}].options is undefined`);
}

function assertHasDefaultLocale(ctx: Context, locales: string[], defaultLocale: string) {
  ctx.assert(
    locales.includes(defaultLocale),
    400,
    `The defaultLocale "${defaultLocale}" is missing in variants`
  );
}

router.get(
  '/',
  sort('orderBy', ['createdAt', 'updatedAt']),
  pagination(),
  boolean('active'),
  async (ctx) => {
    const sortItems = sort.get(ctx);
    const { page, pageSize } = pagination.get(ctx);
    const { active } = boolean.get(ctx);

    const query = TicketField.queryBuilder()
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    if (active !== undefined) {
      query.where('active', '==', active);
    }

    sortItems?.forEach(({ key, order }) => query.orderBy(key, order));

    const fields = ctx.query.count
      ? await query.findAndCount({ useMasterKey: true }).then(([fields, count]) => {
          ctx.set('X-Total-Count', count.toString());
          return fields;
        })
      : await query.find({ useMasterKey: true });

    ctx.body = fields.map((field) => new TicketFieldResponse(field));
  }
);

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

const createFieldDataSchema = z.object({
  type: z.enum(FIELD_TYPES),
  title: z.string(),
  defaultLocale: localeSchema,
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  variants: variantsSchema,
});

router.post('/', customerServiceOnly, async (ctx) => {
  const data = createFieldDataSchema.parse(ctx.request.body);

  if (OPTION_TYPES.includes(data.type)) {
    assertAllVariantsHasOptions(ctx, data.variants);
  } else {
    data.variants.forEach((variant) => delete variant.options);
  }

  const locales = data.variants.map((v) => v.locale);
  assertNoDuplicatedLocale(ctx, locales);
  assertHasDefaultLocale(ctx, locales, data.defaultLocale);

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

  ctx.body = {
    id: field.id,
  };
});

router.param('id', async (id, ctx, next) => {
  const field = await TicketField.find(id, { useMasterKey: true });
  if (field === undefined) {
    ctx.throw(404, `TicketField ${id} is not exists`);
  }
  ctx.state.field = field;
  return next();
});

router.get('/:id', async (ctx) => {
  const field = ctx.state.field as TicketField;
  const variants = await field.getVariants();
  ctx.body = new TicketFieldResponse(field, variants);
});

const modifyFieldDataSchema = z.object({
  title: z.string().optional(),
  defaultLocale: localeSchema.optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  variants: variantsSchema.optional(),
});

router.patch('/:id', customerServiceOnly, async (ctx) => {
  const field = ctx.state.field as TicketField;
  const data = modifyFieldDataSchema.parse(ctx.request.body);

  if (data.defaultLocale) {
    const locales = data.variants
      ? Object.keys(data.variants)
      : (await field.getVariants()).map((v) => v.locale);
    if (!locales.includes(data.defaultLocale)) {
      ctx.throw(400, 'Variant for default locale is not defined');
    }
  }

  if (data.variants) {
    if (OPTION_TYPES.includes(field.type)) {
      assertAllVariantsHasOptions(ctx, data.variants);
    }

    const locales = data.variants.map((v) => v.locale);
    const defaultLocale = data.defaultLocale ?? field.defaultLocale;
    assertHasDefaultLocale(ctx, locales, defaultLocale);

    await field.replaceVariants(data.variants);
  }

  await field.update(
    {
      title: data.title,
      defaultLocale: data.defaultLocale,
      required: data.required,
      active: data.active,
    },
    { useMasterKey: true }
  );

  ctx.body = {};
});

export default router;
