import Router from '@koa/router';

import * as yup from '../utils/yup';
import { getGravatarURL } from '../utils/gravatar';
import { auth } from '../middlewares/auth';
import { search, sort, SortItem } from '../middlewares/search';
import * as ticket from '../objects/ticket';
import { AuthedUser, isStaff } from '../objects/user';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];

const sortKeys = new Set(['status', 'createdAt', 'updatedAt']);

const getTicketsSchema = yup.object({
  id: yup.csv(yup.string().required()),
  authorId: yup.string(),
  assigneeId: yup.string(),
  categoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  evaluationStar: yup.number().oneOf([0, 1]),
  createdAt_gt: yup.date(),
  createdAt_gte: yup.date(),
  createdAt_lt: yup.date(),
  createdAt_lte: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(1).max(100).default(10),
  includeGroup: yup.bool().default(false),
  count: yup.bool().default(false),
});

router.get('/', search, sort, async (ctx) => {
  const user: AuthedUser = ctx.state.user;
  const query = getTicketsSchema.validateSync(ctx.query);
  const sort: SortItem[] = ctx.state.sort;

  if (query.includeGroup) {
    if (!(await isStaff(user.id))) {
      ctx.throw(403);
    }
  }

  let ticketQuery = ticket
    .query()
    .withAuthor()
    .withAssignee()
    .skip(query.page - 1 + query.pageSize)
    .limit(query.pageSize)
    .inUserView(user);

  if (query.id) {
    ticketQuery = ticketQuery.filterById(query.id);
  }
  if (query.authorId) {
    ticketQuery = ticketQuery.filterByAuthorId(query.authorId);
  }
  if (query.assigneeId !== undefined) {
    ticketQuery = ticketQuery.filterByAssigneeId(query.assigneeId);
  }
  if (query.groupId !== undefined) {
    ticketQuery = ticketQuery.filterByGroupId(query.groupId);
  }
  if (query.status) {
    ticketQuery = ticketQuery.filterByStatus(query.status);
  }
  if (query.evaluationStar) {
    ticketQuery = ticketQuery.filterByEvaluationStar(query.evaluationStar);
  }
  if (query.createdAt_gt) {
    ticketQuery = ticketQuery.filterByCreatedAtGT(query.createdAt_gt);
  }
  if (query.createdAt_gte) {
    ticketQuery = ticketQuery.filterByCreatedAtGT(query.createdAt_gte);
  }
  if (query.createdAt_lt) {
    ticketQuery = ticketQuery.filterByCreatedAtGT(query.createdAt_lt);
  }
  if (query.createdAt_lte) {
    ticketQuery = ticketQuery.filterByCreatedAtGT(query.createdAt_lte);
  }
  if (query.includeGroup) {
    ticketQuery = ticketQuery.withGroup();
  }
  if (query.count) {
    ticketQuery = ticketQuery.count();
  }

  if (sort) {
    if (!sort.every(({ key }) => sortKeys.has(key))) {
      ctx.throw(400, 'sort must be one of ' + Array.from(sortKeys).join(', '));
    }
    ticketQuery = ticketQuery.sortBy(sort);
  }

  const { tickets, totalCount } = await ticketQuery.exec();
  const ticketsWithCategoryInfo = await ticket.fillCategoryInfo(tickets);

  ctx.body = {
    totalCount,
    items: ticketsWithCategoryInfo.map((t) => {
      const { author, assignee } = t;

      return {
        id: t.id,
        nid: t.nid,
        title: t.title,
        category: {
          id: t.category.id,
          name: t.category.name,
        },
        categoryPath: t.categoryPath,
        author: {
          id: author.id,
          username: author.username,
          name: author.name,
          avatar: getGravatarURL(author.email ?? author.username),
        },
        assignee: assignee
          ? {
              id: assignee.id,
              username: assignee.username,
              name: assignee.name,
              avatar: getGravatarURL(assignee.email ?? assignee.username),
            }
          : null,
        group: query.includeGroup ? t.group ?? null : undefined,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
  };
});

export default router;
