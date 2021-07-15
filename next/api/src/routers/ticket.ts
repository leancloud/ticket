import Router from '@koa/router';

import * as yup from '../utils/yup';
import { auth } from '../middlewares/auth';
import { search, sort } from '../middlewares/search';
import { AuthedUser } from '../models/user';
import { Ticket } from '../models/ticket';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];
const sortKeys = ['status', 'createdAt', 'updatedAt'];

const getTicketsSchema = yup.object({
  id: yup.csv(yup.string().required()),
  authorId: yup.string(),
  assigneeId: yup.string(),
  categoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  evaluationStar: yup.number().oneOf([0, 1]),
  createdAtGT: yup.date(),
  createdAtLT: yup.date(),
  createdAtGTE: yup.date(),
  createdAtLTE: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(1).max(100).default(10),
  includeGroup: yup.bool().default(false),
  count: yup.bool().default(false),
});

router.get('/', search, sort(sortKeys), async (ctx) => {
  const currentUser = ctx.state.currentUser as AuthedUser;
  const query = getTicketsSchema.validateSync(ctx.query);

  if (query.includeGroup) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
  }

  const { tickets, totalCount } = await Ticket.find(query, {
    user: currentUser,
    sort: ctx.state.sort,
    skip: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
    count: query.count,
    includeGroup: query.includeGroup,
  });

  ctx.body = {
    totalCount,
    items: tickets,
  };
});

export default router;
