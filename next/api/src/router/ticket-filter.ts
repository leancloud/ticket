import Router from '@koa/router';
import { TicketFilterResponse } from '../response/ticket-filter';

import { auth, customerServiceOnly } from '../middleware';
import * as yup from '../utils/yup';
import { QueryBuilder } from '../orm';
import { TicketFilter } from '../model/TicketFilter';

const router = new Router().use(auth, customerServiceOnly);

const querySchema = yup.object({
  userId: yup.csv(yup.string().required()),
  groupId: yup.csv(yup.string().required()),
});

function addIdsCondition(query: QueryBuilder<any>, key: string, ids: string[]) {
  if (ids.includes('null')) {
    query.where(key, 'not-exists');
    ids = ids.filter((id) => id !== 'null');
    if (ids.length) {
      query.orWhere(key, 'in', ids);
    }
  } else {
    query.where(key, 'in', ids);
  }
}

router.get('/', async (ctx) => {
  const { userId, groupId } = querySchema.validateSync(ctx.query);

  const query = TicketFilter.queryBuilder();
  if (userId) {
    addIdsCondition(query, 'userIds', userId);
  }
  if (groupId) {
    addIdsCondition(query, 'groupIds', groupId);
  }

  const filters = await query.find({ useMasterKey: true });
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
  userIds: yup.array(yup.string().required()),
  groupIds: yup.array(yup.string().required()),
  filters: filtersFieldSchema.default(undefined).required(),
});

router.post('/', async (ctx) => {
  const data = createSchema.validateSync(ctx.request.body);
  const filter = await TicketFilter.create(
    {
      ...data,
      ACL: {
        'role:customerService': { read: true, write: true },
      },
    },
    { useMasterKey: true }
  );
  ctx.body = new TicketFilterResponse(filter);
});

router.param('id', async (id, ctx, next) => {
  ctx.state.filter = await TicketFilter.findOrFail(id, { useMasterKey: true });
  return next();
});

router.get('/:id', (ctx) => {
  ctx.body = new TicketFilterResponse(ctx.state.filter);
});

const updateSchema = yup.object({
  name: yup.string().trim().min(1).max(20),
  userIds: yup.array(yup.string().required()).nullable(),
  groupIds: yup.array(yup.string().required()).nullable(),
  filters: filtersFieldSchema.default(undefined),
});

router.patch('/:id', async (ctx) => {
  const filter = ctx.state.filter as TicketFilter;
  const data = updateSchema.validateSync(ctx.request.body);
  await filter.update(data, { useMasterKey: true });
  ctx.body = {};
});

router.delete('/:id', async (ctx) => {
  const filter = ctx.state.filter as TicketFilter;
  await filter.delete({ useMasterKey: true });
  ctx.body = {};
});

export default router;
