import Router from '@koa/router';
import _ from 'lodash';

import * as yup from '../utils/yup';
import { SortItem, auth, parseRange, sort } from '../middleware';
import { Ticket } from '../model/ticket';
import { User } from '../model/user';
import { Group } from '../model/group';
import { CategoryManager } from '../model/category';
import { TicketJSON, TicketListItemJson } from '../json/ticket';
import { Reply } from '../model/reply';
import { ReplyJSON } from '../json/reply';
import AV from 'leancloud-storage';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];
const sortKeys = ['status', 'createdAt', 'updatedAt'];
const includeKeys = ['author', 'assignee', 'category', 'files'];
const staffOnlyIncludeKeys = ['group'];

const incluldeSchema = yup.csv(
  yup.string().oneOf(includeKeys.concat(staffOnlyIncludeKeys)).required()
);

const findTicketsSchema = yup.object({
  where: yup.object(),
  authorId: yup.string(),
  assigneeId: yup.csv(yup.string().required()),
  categoryId: yup.csv(yup.string().required()),
  rootCategoryId: yup.string(),
  groupId: yup.csv(yup.string().required()),
  status: yup.csv(yup.number().oneOf(statuses).required()),
  'evaluation.star': yup.number().oneOf([0, 1]),
  createdAt: yup.date(),
  createdAtFrom: yup.date(),
  createdAtTo: yup.date(),
  page: yup.number().min(1).default(1),
  pageSize: yup.number().min(1).max(100).default(10),
  include: incluldeSchema,
  count: yup.bool().default(false),
  includeCategoryPath: yup.bool().default(false),
});

router.get('/', sort('orderBy', sortKeys), parseRange('createdAt'), async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const params = findTicketsSchema.validateSync(ctx.query);
  const sort = ctx.state.sort as SortItem[] | undefined;

  if (_.intersection(params.include, staffOnlyIncludeKeys).length) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
  }

  const categoryIds = new Set(params.categoryId);
  if (params.rootCategoryId) {
    categoryIds.add(params.rootCategoryId);
    const subCategories = await CategoryManager.getSubCategories(params.rootCategoryId);
    subCategories.forEach((c) => categoryIds.add(c.id));
  }

  const query = Ticket.query()
    .when(params.where, (query, where) => {
      return query.where('', 'init', where);
    })
    .when(params.authorId, (query, authorId) => {
      return query.where('author', '==', User.ptr(authorId));
    })
    .when(params.assigneeId, (query, assigneeId) => {
      if (assigneeId.includes('null')) {
        assigneeId = assigneeId.filter((id) => id !== 'null');
        if (assigneeId.length) {
          return query.whereInOrNotExists('assignee', assigneeId.map(User.ptr));
        }
        return query.where('assignee', 'not-exists');
      }
      return query.where('assignee', 'in', assigneeId.map(User.ptr));
    })
    .when(params.groupId, (query, groupId) => {
      if (groupId.includes('null')) {
        groupId = groupId.filter((id) => id !== 'null');
        if (groupId.length) {
          return query.whereInOrNotExists('group', groupId.map(Group.ptr));
        }
        return query.where('group', 'not-exists');
      }
      return query.where('group', 'in', groupId.map(Group.ptr));
    })
    .when(categoryIds.size, (query) => {
      return query.where('category.objectId', 'in', Array.from(categoryIds));
    })
    .when(params.status, (query, status) => {
      return query.where('status', 'in', status);
    })
    .when(params['evaluation.star'], (query, star) => {
      return query.where('evaluation.star', '==', star);
    })
    .when(params.createdAtFrom, (query, createdAtFrom) => {
      return query.where('createdAt', '>=', createdAtFrom);
    })
    .when(params.createdAtTo, (query, createdAtTo) => {
      return query.where('createdAt', '<=', createdAtTo);
    })
    .when(sort, (query, sort) => {
      return query.orderBy(sort.map(({ key, order }) => [key, order]) as any);
    })
    .when(params.include, (query, includeKeys) => {
      if (includeKeys.includes('author')) {
        query = query
          .modifyQuery((q) => q.include('author'))
          .modifyResult((items, objects) => {
            items.forEach((item, index) => {
              item.author = User.fromAVObject(objects[index].get('author'));
            });
          });
      }
      if (includeKeys.includes('assignee')) {
        query = query
          .modifyQuery((q) => q.include('assignee'))
          .modifyResult((items, objects) => {
            items.forEach((item, index) => {
              const assigneeObj = objects[index].get('assignee');
              if (assigneeObj) {
                item.assignee = User.fromAVObject(assigneeObj);
              }
            });
          });
      }
      if (includeKeys.includes('group')) {
        query = query
          .modifyQuery((q) => q.include('group'))
          .modifyResult((items, objects) => {
            items.forEach((item, index) => {
              const groupObj = objects[index].get('group');
              if (groupObj) {
                item.group = Group.fromAVObject(groupObj);
              }
            });
          });
      }
      if (includeKeys.includes('files')) {
        query = query.modifyQuery((q) => q.include('files'));
      }
      return query;
    })
    .skip((params.page - 1) * params.pageSize)
    .limit(params.pageSize);

  let tickets: Ticket[];
  if (params.count) {
    const result = await query.getWithTotalCount(currentUser);
    tickets = result[0];
    ctx.set('X-Total-Count', result[1].toString());
    ctx.set('Access-Control-Expose-Headers', 'X-Total-Count');
  } else {
    tickets = await query.get(currentUser);
  }

  if (params.includeCategoryPath) {
    await Promise.all(tickets.map((ticket) => ticket.updateCategoryPath()));
  }

  let notificationMap: Record<string, AV.Object> = {};
  try {
    const notifications = await new AV.Query<AV.Object>('notification')
      .containedIn(
        'ticket',
        tickets.map((ticket) => Ticket.ptr(ticket.id))
      )
      .equalTo('user', User.ptr(currentUser.id))
      .find({ sessionToken: currentUser.sessionToken });
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
});

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

const getTicketSchema = yup.object({
  include: incluldeSchema,
  includeCategoryPath: yup.bool().default(false),
});

router.get('/:id', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const params = getTicketSchema.validateSync(ctx.query);
  if (_.intersection(params.include, staffOnlyIncludeKeys).length) {
    if (!(await currentUser.isCustomerService())) {
      ctx.throw(403);
    }
  }
  const ticket = await Ticket.find(ctx.params.id, params.include, currentUser.sessionToken);
  if (params.includeCategoryPath) {
    await ticket.updateCategoryPath();
  }
  ctx.body = new TicketJSON(ticket).toJSON();
  resetUnreadCount(ticket, currentUser);
});

router.get('/:id/replies', async (ctx) => {
  const currentUser = ctx.state.currentUser as User;
  const query = Reply.query()
    .where('ticket', '==', Ticket.ptr(ctx.params.id))
    .modifyQuery((q) => q.include(['author', 'files']));
  const replies = await query.get({ sessionToken: currentUser.sessionToken });
  ctx.body = replies.map((reply) => new ReplyJSON(reply));
});

export default router;
