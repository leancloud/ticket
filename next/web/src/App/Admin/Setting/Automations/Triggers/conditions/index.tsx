import { Ticket } from './Ticket';
import { StringValue } from './StringValue';
import { CategoryId } from './CategoryId';
import { AuthorId } from './AuthorId';
import { AssigneeId } from './AssigneeId';
import { GroupId } from './GroupId';
import { Status } from './Status';
import { CurrentUserId } from './CurrentUserId';

export default {
  ticket: {
    label: '工单',
    component: Ticket,
  },
  title: {
    label: '标题',
    component: StringValue,
  },
  content: {
    label: '描述',
    component: StringValue,
  },
  categoryId: {
    label: '分类',
    component: CategoryId,
  },
  authorId: {
    label: '创建者',
    component: AuthorId,
  },
  assigneeId: {
    label: '负责人',
    component: AssigneeId,
  },
  groupId: {
    label: '客服组',
    component: GroupId,
  },
  status: {
    label: '状态',
    component: Status,
  },
  currentUserId: {
    label: '当前用户',
    component: CurrentUserId,
  },
};
