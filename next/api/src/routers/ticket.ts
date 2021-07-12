import Router from '@koa/router';
import * as yup from 'yup';

import { auth } from '../middlewares/auth';
import { csv2array } from '../middlewares/convert';
import { search } from '../middlewares/search';
import { Ticket } from '../models/ticket';
import { LoggedInUser } from '../models/user';

const router = new Router({ prefix: '/tickets' }).use(auth);

const getTicketsSchema = yup.object({
  author_id: yup.string().trim(),
  assignee_id: yup.string().trim(),
  group_id: yup.string().trim(),
  category_id: yup.string().trim(),
  status: yup.array(yup.number().oneOf(Object.values(Ticket.STATUS)).required()),
  evaluation_star: yup.array(yup.number().oneOf([0, 1])),
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

router.get('/', search({ sortKeyMap }), csv2array('status'), async (ctx) => {
  const user = ctx.state.user as LoggedInUser;
  const query = getTicketsSchema.validateSync(ctx.query);
  const tickets = await Ticket.find(
    {
      authorId: query.author_id,
      assigneeId: query.assignee_id,
      groupId: query.group_id,
      categoryId: query.category_id,
      status: query.status,
      createdAt_gt: query.created_at_gt,
      createdAt_gte: query.created_at_gte,
      createdAt_lt: query.created_at_lt,
      createdAt_lte: query.created_at_lte,
    },
    {
      skip: (query.page - 1) * query.page_size,
      limit: query.page_size,
      sort: ctx.state.sort,
      authOptions: user.getAuthOptions(),
    }
  );
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
      status: ticket.status,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    };
  });
});

export default router;
