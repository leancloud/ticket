import Router from '@koa/router';
import * as yup from '../utils/yup';
import { auth, customerServiceOnly } from '../middlewares';
import { LOCALES, Locale } from '../models/form/field';
import formService from '../models/form/Form';
const router = new Router().use(auth, customerServiceOnly);

const findSchema = yup.object({
  limit: yup.number().min(1).default(100),
  skip: yup.number().min(0).default(0),
});

router.get('/', async (ctx) => {
  const query = findSchema.validateSync(ctx.query);
  const { list, count } = await formService.findWithCount(query, undefined, [
    {
      order: 'desc',
      key: 'updatedAt',
    },
  ]);
  ctx.set('X-Total-Count', count.toString());
  ctx.body = list;
});

const postSchema = yup.object({
  title: yup.string().required(),
  fieldIds: yup.array().min(1).of(yup.string().required()).required(),
});
router.post('/', async (ctx) => {
  const data = postSchema.validateSync(ctx.request.body);
  ctx.body = await formService.save(data);
});

const getSchema = yup.object({
  locale: yup.mixed<Locale>().oneOf(LOCALES),
});
router.get('/:id', async (ctx) => {
  const query = getSchema.validateSync(ctx.query);
  const { locale } = query;
  ctx.body = await formService.getDetail(ctx.params.id, locale);
});

const patchSchema = yup.object({
  title: yup.string().min(1),
  fieldIds: yup.array().min(1).of(yup.string().required()),
});
router.patch('/:id', async (ctx) => {
  const id = ctx.params.id;
  const data = patchSchema.validateSync(ctx.request.body);
  ctx.body = await formService.update(id, data);
});

router.delete('/:id', async (ctx) => {
  const id = ctx.params.id;
  ctx.body = await formService.delete(id);
});

export default router;
