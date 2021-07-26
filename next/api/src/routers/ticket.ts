import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth, sort } from '../middlewares';
import { AuthedUser } from '../models/user';
import { Ticket, TicketFilter } from '../models/ticket';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];
const sortKeys = ['status', 'createdAt', 'updatedAt'];

const findTicketsSchema = yup.object({
  authorId: yup.string(),
  assigneeId: yup.string(),
  categoryId: yup.string(),
  rootCategoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  evaluationStar: yup.number().oneOf([0, 1]),
  createdAtSince: yup.date(),
  createdAtUntil: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(1).max(100).default(10),
  includeGroup: yup.bool().default(false),
  count: yup.bool().default(false),
});

router.get('/', sort('orderBy', sortKeys), async (ctx) => {
  const currentUser = ctx.state.currentUser as AuthedUser;
  const query = findTicketsSchema.validateSync(ctx.query);

  if (query.includeGroup) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
  }

  const filter: TicketFilter = {
    authorId: query.authorId,
    assigneeId: query.assigneeId,
    categoryId: query.categoryId,
    rootCategoryId: query.rootCategoryId,
    groupId: query.groupId,
    status: query.status,
    evaluationStar: query.evaluationStar,
    createdAt: [query.createdAtSince, query.createdAtUntil],
  };

  const { tickets, totalCount } = await Ticket.find(filter, {
    user: currentUser,
    sort: ctx.state.sort,
    skip: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
    count: query.count,
    includeGroup: query.includeGroup,
  });

  if (totalCount !== undefined) {
    ctx.set('X-Total-Count', totalCount.toString());
  }
  ctx.body = tickets;
});

router.param('ticket', async (id, ctx, next) => {
  ctx.state.ticket = await Ticket.get(id, {
    user: ctx.state.currentUser,
  });
  return next();
});

const getTicketSchema = yup.object({
  includeGroup: yup.bool(),
});

router.get('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as AuthedUser;
  const query = getTicketSchema.validateSync(ctx.query);

  if (query.includeGroup) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
  }

  const ticket = await Ticket.get(ctx.params.id, {
    user: ctx.state.currentUser,
    includeGroup: query.includeGroup,
  });
  ctx.body = ticket;
});

export default router;
