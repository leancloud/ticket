import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middlewares/auth';
import { search, sort, SortItem } from '../middlewares/search';
import { TicketConditions, Ticket } from '../models/ticket';
import { LoggedInUser } from '../models/user';

const router = new Router().use(auth);

const statuses = Object.values(Ticket.STATUS);

const getTicketsSchema = yup.object({
  id: yup.csv(yup.string().required()),
  author_id: yup.string(),
  assignee_id: yup.string(),
  category_id: yup.string(),
  group_id: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  evaluation_star: yup.number().oneOf([0, 1]),
  created_at_gt: yup.date(),
  created_at_gte: yup.date(),
  created_at_lt: yup.date(),
  created_at_lte: yup.date(),
  page: yup.number().min(1).default(1),
  page_size: yup.number().min(1).max(100).default(10),
});

const sortKeyMap: Record<string, string> = {
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

router.get('/', search, sort, async (ctx) => {
  const user: LoggedInUser = ctx.state.user;
  const query = getTicketsSchema.validateSync(ctx.query);
  const sort: SortItem[] = ctx.state.sort;

  if (!sort.every(({ key }) => sortKeyMap[key])) {
    ctx.throw(400, 'sort must be one of ' + Object.keys(sortKeyMap).join(', '));
  }

  const conditions: TicketConditions = {
    id: query.id,
    authorId: query.author_id,
    assigneeId: query.assignee_id,
    groupId: query.group_id,
    status: query.status,
    evaluationStar: query.evaluation_star as 0 | 1,
    createdAt_gt: query.created_at_gt,
    createdAt_gte: query.created_at_gte,
    createdAt_lt: query.created_at_lt,
    createdAt_lte: query.created_at_lte,
  };
  const tickets = await Ticket.find(conditions, {
    skip: (query.page - 1) * query.page_size,
    limit: query.page_size,
    sort: sort.map(({ key, order }) => ({ key: sortKeyMap[key], order })),
    authOptions: user.getAuthOptions(),
  });

  ctx.body = tickets.map((ticket) => {
    return {
      id: ticket.id,
      nid: ticket.nid,
      title: ticket.title,
      author: {
        id: ticket.author.id,
        username: ticket.author.username,
        name: ticket.author.name,
      },
      category: {
        id: ticket.category.id,
        name: ticket.category.name,
        parents: ticket.category.parents,
      },
      assignee: ticket.assignee
        ? {
            id: ticket.assignee.id,
            username: ticket.assignee.username,
            name: ticket.assignee.name,
          }
        : null,
      group: ticket.group
        ? {
            id: ticket.group.id,
            name: ticket.group.name,
          }
        : null,
      status: ticket.status,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    };
  });
});

export default router;
