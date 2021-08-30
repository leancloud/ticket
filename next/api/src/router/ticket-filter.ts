import Router from '@koa/router';
import { TicketFilterResponse } from '../json/ticket-filter';

import { auth, customerServiceOnly } from '../middleware';
import * as yup from '../utils/yup';
import { Group } from '../model/group';
import { TicketFilter } from '../model/ticket-filter';
import { User } from '../model/user';

const router = new Router().use(auth, customerServiceOnly);

router.get('/', async (ctx) => {
  const { userId, groupId } = ctx.query;

  const query = TicketFilter.query()
    .when(typeof userId === 'string', (query) => {
      if (userId === 'null') {
        return query.where('user', 'not-exists');
      }
      return query.where('user', '==', User.ptr(userId as string));
    })
    .when(typeof groupId === 'string', (query) => {
      if (groupId === 'null') {
        return query.where('group', 'not-exists');
      }
      return query.where('group', '==', Group.ptr(groupId as string));
    });

  const filters = await query.get({ useMasterKey: true });
  ctx.body = filters.map((filter) => new TicketFilterResponse(filter));
});

const filtersFieldSchema = yup.object({
  assigneeIds: yup.array(yup.string().required()),
  groupIds: yup.array(yup.string().required()),
  createdAt: yup.string(),
  rootCategoryId: yup.string(),
  statuses: yup.array(yup.number().required()),
});

const createSchema = yup.object({
  name: yup.string().trim().min(1).max(20).required(),
  userId: yup.string(),
  groupId: yup.string(),
  filters: filtersFieldSchema.required(),
});

router.post('/', async (ctx) => {
  const data = createSchema.validateSync(ctx.request.body);
  const filter = await TicketFilter.create(data);
  ctx.body = new TicketFilterResponse(filter);
});

router.param('id', async (id, ctx, next) => {
  ctx.state.filter = await TicketFilter.find(id);
  return next();
});

router.get('/:id', (ctx) => {
  ctx.body = new TicketFilterResponse(ctx.state.filter);
});

const updateSchema = yup.object({
  name: yup.string().trim().min(1).max(20),
  userId: yup.string().nullable(),
  groupId: yup.string().nullable(),
  filters: filtersFieldSchema.default(undefined),
});

router.patch('/:id', async (ctx) => {
  const filter = ctx.state.filter as TicketFilter;
  const data = updateSchema.validateSync(ctx.request.body);
  await filter.update(data);
  ctx.body = {};
});

router.delete('/:id', async (ctx) => {
  const filter = ctx.state.filter as TicketFilter;
  await filter.delete();
  ctx.body = {};
});

export default router;
