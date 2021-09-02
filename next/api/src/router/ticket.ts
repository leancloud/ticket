import Router from '@koa/router';
import _ from 'lodash';

import * as yup from '../utils/yup';
import { SortItem, auth, parseRange, sort } from '../middleware';
import { Ticket } from '../model/ticket';
import { User } from '../model/user';
import { Group } from '../model/group';
import { CategoryManager } from '../model/category';
import { TicketListItemJson } from '../json/ticket';

const router = new Router().use(auth);

const statuses = [50, 120, 160, 220, 250, 280];
const sortKeys = ['status', 'createdAt', 'updatedAt'];
const includeKeys = ['author', 'assignee', 'category'];
const staffOnlyIncludeKeys = ['group'];

const findTicketsSchema = yup.object({
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
  include: yup.csv(yup.string().oneOf(includeKeys.concat(staffOnlyIncludeKeys)).required()),
  count: yup.bool().default(false),
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
      return query;
    })
    .skip((params.page - 1) * params.pageSize)
    .limit(params.pageSize);

  let tickets: Ticket[];
  if (params.count) {
    const result = await query.getWithTotalCount(currentUser);
    tickets = result[0];
    ctx.set('X-Total-Count', result[1].toString());
  } else {
    tickets = await query.get(currentUser);
  }

  ctx.body = tickets.map((t) => new TicketListItemJson(t));
});

export default router;
