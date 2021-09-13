import Router from '@koa/router';
import AV from 'leancloud-storage';
import _ from 'lodash';

import * as yup from '../utils/yup';
import { SortItem, auth, include, parseRange, sort } from '../middleware';
import { Model, QueryBuilder } from '../orm';
import { CategoryManager } from '../model2/Category';
import { Group } from '../model2/Group';
import { Reply } from '../model2/Reply';
import { Ticket } from '../model2/Ticket';
import { User } from '../model2/User';
import { TicketJSON, TicketListItemJson } from '../json/ticket';
import { ReplyJSON } from '../json/reply';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];

const includeSchema = {
  includeAuthor: yup.bool(),
  includeAssignee: yup.bool(),
  includeCategory: yup.bool(), // TODO
  includeGroup: yup.bool(),
  includeFiles: yup.bool(),
  includeCategoryPath: yup.bool(),
};

const findTicketsSchema = yup.object({
  where: yup.object(),
  authorId: yup.string(),
  assigneeId: yup.csv(yup.string().required()),
  categoryId: yup.csv(yup.string().required()),
  rootCategoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  'evaluation.star': yup.number().oneOf([0, 1]),
  createdAtFrom: yup.date(),
  createdAtTo: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(1).max(100).default(10),
  count: yup.bool().default(false),
  ...includeSchema,
});

function addPointersCondition(
  query: QueryBuilder<any>,
  key: string,
  ids: string[],
  pointedModel: typeof Model
) {
  const createPointer = pointedModel.ptr.bind(pointedModel);
  if (ids.includes('null')) {
    query.where(key, 'not-exists');
    ids = ids.filter((id) => id !== 'null');
    if (ids.length) {
      query.orWhere(key, 'in', ids.map(createPointer));
    }
  } else {
    query.where(key, 'in', ids.map(createPointer));
  }
}

router.get(
  '/',
  sort('orderBy', ['status', 'createdAt', 'updatedAt']),
  parseRange('createdAt'),
  include,
  async (ctx) => {
    const currentUser = ctx.state.currentUser as User;
    const params = findTicketsSchema.validateSync(ctx.query);
    const sort = ctx.state.sort as SortItem[] | undefined;

    const categoryIds = new Set(params.categoryId);
    if (params.rootCategoryId) {
      categoryIds.add(params.rootCategoryId);
      const subCategories = await CategoryManager.getSubCategories(params.rootCategoryId);
      subCategories.forEach((c) => categoryIds.add(c.id));
    }

    const query = Ticket.queryBuilder();
    if (params.where) {
      query.setRawCondition(params.where);
    }
    if (params.authorId) {
      query.where('author', '==', User.ptr(params.authorId));
    }
    if (params.assigneeId) {
      addPointersCondition(query, 'assignee', params.assigneeId, User);
    }
    if (params.groupId) {
      addPointersCondition(query, 'group', params.groupId, Group);
    }
    if (categoryIds.size) {
      query.where('category.objectId', 'in', Array.from(categoryIds));
    }
    if (params.status) {
      query.where('status', 'in', params.status);
    }
    if (params['evaluation.star']) {
      query.where('evaluation.star', '==', params['evaluation.star']);
    }
    if (params.createdAtFrom) {
      query.where('createdAt', '>=', params.createdAtFrom);
    }
    if (params.createdAtTo) {
      query.where('createdAt', '<=', params.createdAtTo);
    }
    if (sort) {
      sort.forEach(({ key, order }) => query.orderBy(key, order));
    }
    if (params.includeAuthor) {
      query.preload('author');
    }
    if (params.includeAssignee) {
      query.preload('assignee');
    }
    if (params.includeGroup) {
      if (!(await currentUser.isCustomerService())) {
        ctx.throw(403);
      }
      query.preload('group');
    }
    if (params.includeFiles) {
      query.preload('files');
    }

    query.skip((params.page - 1) * params.pageSize).limit(params.pageSize);

    let tickets: Ticket[];
    if (params.count) {
      const result = await query.findAndCount(currentUser.getAuthOptions());
      tickets = result[0];
      ctx.set('X-Total-Count', result[1].toString());
      ctx.set('Access-Control-Expose-Headers', 'X-Total-Count');
    } else {
      tickets = await query.find(currentUser.getAuthOptions());
    }

    if (params.includeCategoryPath) {
      await Promise.all(tickets.map((ticket) => ticket.loadCategoryPath()));
    }

    let notificationMap: Record<string, AV.Object> = {};
    try {
      const notifications = await new AV.Query<AV.Object>('notification')
        .containedIn(
          'ticket',
          tickets.map((ticket) => Ticket.ptr(ticket.id))
        )
        .equalTo('user', User.ptr(currentUser.id))
        .find(currentUser.getAuthOptions());
      notificationMap = _.keyBy(
        notifications,
        (notification) => notification.get('ticket')?.id as string
      );
    } catch (error) {
      // It's OK to fail fetching notifications
      // TODO: Sentry
      console.error(error);
    }
    ctx.body = tickets.map((ticket) => ({
      ...new TicketListItemJson(ticket).toJSON(),
      unreadCount: notificationMap[ticket.id]?.get('unreadCount') || 0,
    }));
  }
);

function resetUnreadCount(ticket: Ticket, currentUser: User) {
  new AV.Query<AV.Object>('notification')
    .equalTo('ticket', Ticket.ptr(ticket.id))
    .equalTo('user', User.ptr(currentUser.id))
    .greaterThan('unreadCount', 0)
    .first({ sessionToken: currentUser.sessionToken })
    .then((notification) =>
      notification?.save({ unreadCount: 0 }, { sessionToken: currentUser.sessionToken })
    )
    .catch(console.error);
}

const getTicketSchema = yup.object({ ...includeSchema });

router.get('/:id', include, async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const params = getTicketSchema.validateSync(ctx.query);

  const query = Ticket.queryBuilder().where('objectId', '==', ctx.params.id);
  if (params.includeAuthor) {
    query.preload('author');
  }
  if (params.includeAssignee) {
    query.preload('assignee');
  }
  if (params.includeGroup) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
    query.preload('group');
  }
  if (params.includeFiles) {
    query.preload('files');
  }

  const ticket = await query.first(currentUser.getAuthOptions());
  if (!ticket) {
    ctx.throw(404);
    return;
  }
  if (params.includeCategoryPath) {
    await ticket.loadCategoryPath();
  }
  ctx.body = new TicketJSON(ticket).toJSON();
  resetUnreadCount(ticket, currentUser);
});

router.get('/:id/replies', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const query = Reply.queryBuilder()
    .where('ticket', '==', Ticket.ptr(ctx.params.id))
    .preload('author')
    .preload('files');
  const replies = await query.find(currentUser.getAuthOptions());
  ctx.body = replies.map((reply) => new ReplyJSON(reply));
});

export default router;
