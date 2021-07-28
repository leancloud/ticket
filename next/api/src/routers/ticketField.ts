import Router from '@koa/router';
import * as yup from '../utils/yup';
import { auth, customerServiceOnly } from '../middlewares';
import fieldService, { FIELD_TYPES, FieldType, Locale, LOCALES } from '../models/form/field';
const router = new Router().use(auth, customerServiceOnly);

const findSchema = yup.object({
  limit: yup.number().min(1).default(100),
  skip: yup.number().min(0).default(0),
  active: yup.bool().default(true),
  title: yup.string().default(''),
});
router.get('/', async (ctx) => {
  const { title, active, ...rest } = findSchema.validateSync(ctx.query);
  if (title !== undefined) {
    ctx.body = await fieldService.find([
      {
        field: 'active',
        value: active,
        method: 'equalTo',
      },
      {
        field: 'title',
        value: title,
        method: 'contains',
      },
    ]);
  } else {
    const { list, count } = await fieldService.findWithCount(rest, [
      {
        field: 'active',
        value: active,
        method: 'equalTo',
      },
    ]);
    ctx.set('X-Total-Count', count.toString());
    ctx.body = list;
  }
});

const postSchema = yup.object({
  title: yup.string().min(1).required(),
  type: yup.mixed<FieldType>().oneOf(FIELD_TYPES).required(),
  required: yup.bool().default(false),
  defaultLocale: yup.mixed<Locale>().oneOf(LOCALES).required(),
  variants: yup
    .array()
    .of(
      yup.object().shape({
        title: yup.string().min(1).required(),
        locale: yup.mixed<Locale>().oneOf(LOCALES).required(),
        options: yup.array(),
      })
    )
    .required(),
});
router.post('/', async (ctx) => {
  const data = postSchema.validateSync(ctx.request.body);
  const { variants, ...rest } = data;
  ctx.body = await fieldService.saveWithVariants(rest, variants);
});

router.get('/:id', async (ctx) => {
  const id = ctx.params.id;
  ctx.body = await fieldService.getDetail(id);
});

const patchSchema = yup.object({
  title: yup.string().min(1),
  type: yup.mixed<FieldType>().oneOf(FIELD_TYPES),
  required: yup.bool(),
  defaultLocale: yup.mixed<Locale>().oneOf(LOCALES),
  variants: yup.array().of(
    yup.object().shape({
      title: yup.string().min(1),
      locale: yup.mixed<Locale>().oneOf(LOCALES),
      options: yup.array(),
    })
  ),
});

router.patch('/:id', async (ctx) => {
  const id = ctx.params.id;
  const data = patchSchema.validateSync(ctx.request.body);
  const { variants, ...rest } = data;
  ctx.body = await fieldService.updateWithVariants(id, rest, variants);
});

router.delete('/:id', async (ctx) => {
  const id = ctx.params.id;
  ctx.body = await fieldService.delete(id);
});

export default router;
